/**
 * AI client with automatic fallback chain:
 *   1. Gemini 2.0 Flash   (primary — free tier 1,500 req/day)
 *   2. Gemini 1.5 Flash   (fallback — separate quota pool)
 *   3. Groq Llama 3.3 70B (final fallback — very generous free tier, needs GROQ_API_KEY)
 *
 * 429 quota errors are retried automatically across the chain.
 * Set AI_PROVIDER=groq to skip Gemini entirely and go straight to Groq.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests')
}

function stripFences(text: string): string {
  return text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function callGemini(model: string, prompt: string, json: boolean): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
  const m = genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature: json ? 0.4 : 0.6,
      ...(json ? { responseMimeType: 'application/json' as const } : {}),
    },
  })
  const result = await m.generateContent(prompt)
  return result.response.text()
}

// ─── Groq ─────────────────────────────────────────────────────────────────────

async function callGroq(prompt: string, json: boolean): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not set — cannot use Groq fallback')
  }
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: json ? 0.4 : 0.6,
    ...(json ? { response_format: { type: 'json_object' as const } } : {}),
    messages: [{ role: 'user', content: prompt }],
  })
  return completion.choices[0]?.message?.content ?? ''
}

// ─── Provider chain ───────────────────────────────────────────────────────────

const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash']

async function generate(prompt: string, json: boolean): Promise<string> {
  const forceGroq = process.env.AI_PROVIDER === 'groq'

  // Skip Gemini entirely if env forces Groq
  if (!forceGroq && process.env.GOOGLE_AI_API_KEY) {
    for (const model of GEMINI_MODELS) {
      try {
        const text = await callGemini(model, prompt, json)
        return text
      } catch (err) {
        if (isQuotaError(err)) {
          console.warn(`[AI] ${model} quota exceeded — trying next provider`)
          await sleep(1000)
          continue
        }
        throw err // non-quota error → don't swallow it
      }
    }
  }

  // Groq fallback
  try {
    console.info('[AI] Using Groq (Llama 3.3 70B)')
    return await callGroq(prompt, json)
  } catch (err) {
    if (isQuotaError(err)) {
      // Wait the suggested 30s and retry Groq once
      console.warn('[AI] Groq rate limited — waiting 30s and retrying')
      await sleep(30_000)
      return callGroq(prompt, json)
    }
    throw err
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Generate a JSON response and parse it. Works across all providers. */
export async function generateJSON<T>(prompt: string): Promise<T> {
  const text = await generate(prompt, true)
  const clean = stripFences(text)
  return JSON.parse(clean) as T
}

/** Generate a plain text response. */
export async function generateText(prompt: string): Promise<string> {
  return generate(prompt, false)
}
