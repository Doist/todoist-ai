import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

// Use Gemini 2.0 Flash — the most capable free-tier model
const MODEL = 'gemini-2.0-flash'

function getModel() {
  return genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4,
    },
  })
}

/** Generic JSON generation helper. Returns parsed JSON. */
export async function generateJSON<T>(prompt: string): Promise<T> {
  const model = getModel()
  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Strip markdown fences if model ignores responseMimeType
  const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  return JSON.parse(clean) as T
}

/** Text-only generation (no JSON enforcement). */
export async function generateText(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: { temperature: 0.6 },
  })
  const result = await model.generateContent(prompt)
  return result.response.text()
}
