#!/usr/bin/env node

/**
 * Setup script to store Todoist credentials in the system keychain
 * 
 * Usage:
 *   node scripts/setup-keychain.js <api_key>
 *   
 * Or run interactively:
 *   node scripts/setup-keychain.js
 */

import { createInterface } from 'readline'
import { storeCredentials, hasCredentials, clearCredentials } from '../dist/utils/keychain.js'

function createReadlineInterface() {
    return createInterface({
        input: process.stdin,
        output: process.stdout
    })
}

function question(rl, prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve)
    })
}

function questionHidden(rl, prompt) {
    return new Promise((resolve) => {
        // Hide input by muting stdout
        const stdin = process.stdin
        const stdout = process.stdout
        
        stdout.write(prompt)
        stdin.setRawMode(true)
        stdin.resume()
        stdin.setEncoding('utf8')
        
        let input = ''
        const onData = (char) => {
            switch (char) {
                case '\n':
                case '\r':
                case '\u0004': // Ctrl+D
                    stdin.setRawMode(false)
                    stdin.pause()
                    stdin.removeListener('data', onData)
                    stdout.write('\n')
                    resolve(input)
                    break
                case '\u0003': // Ctrl+C
                    process.exit(1)
                    break
                case '\u007f': // Backspace
                case '\b':
                    if (input.length > 0) {
                        input = input.slice(0, -1)
                        stdout.write('\b \b')
                    }
                    break
                default:
                    if (char >= ' ') { // Printable characters
                        input += char
                        stdout.write('*')
                    }
                    break
            }
        }
        
        stdin.on('data', onData)
    })
}

async function getCredentialsInteractively() {
    const rl = createReadlineInterface()
    
    try {
        console.log('Setting up Todoist API key in keychain...\n')
        console.log('Note: Base URL can be set via TODOIST_BASE_URL environment variable if needed.\n')
        
        const apiKey = await questionHidden(rl, 'Enter your Todoist API key (hidden): ')
        if (!apiKey.trim()) {
            throw new Error('API key is required')
        }
        
        return {
            apiKey: apiKey.trim()
        }
    } finally {
        rl.close()
    }
}

function getCredentialsFromArgs() {
    const [, , apiKey] = process.argv
    
    if (!apiKey) {
        return null
    }
    
    return {
        apiKey
    }
}

async function confirmOverwrite() {
    const rl = createReadlineInterface()
    
    try {
        const answer = await question(rl, 'Credentials already exist. Overwrite? (y/N): ')
        return answer.toLowerCase().startsWith('y')
    } finally {
        rl.close()
    }
}

async function main() {
    try {
        // Check if credentials already exist
        if (hasCredentials()) {
            console.log('⚠️  Credentials already exist in keychain.')
            const shouldOverwrite = await confirmOverwrite()
            
            if (!shouldOverwrite) {
                console.log('Setup cancelled.')
                process.exit(0)
            }
            
            console.log('Clearing existing credentials...')
            clearCredentials()
        }
        
        // Get credentials from command line args or interactively
        let credentials = getCredentialsFromArgs()
        
        if (!credentials) {
            credentials = await getCredentialsInteractively()
        }
        
        // Store credentials
        console.log('Storing credentials in keychain...')
        storeCredentials(credentials)
        
        console.log('✅ API key stored successfully!')
        console.log('\nThe server will automatically use the keychain API key when no TODOIST_API_KEY environment variable is set.')
        console.log('You can now run: npx @doist/todoist-ai')
        
    } catch (error) {
        console.error('❌ Error:', error.message)
        process.exit(1)
    }
}

main()
