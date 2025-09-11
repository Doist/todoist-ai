import { Entry } from '@napi-rs/keyring'

const SERVICE_NAME = 'com.mcp.todoist-ai'
const API_KEY_ACCOUNT = 'api_key'

/**
 * Store Todoist API key in the user keychain
 */
export function storeCredentials({ apiKey }: { apiKey: string }): void {
    const apiKeyEntry = Entry.withTarget('user', SERVICE_NAME, API_KEY_ACCOUNT)
    apiKeyEntry.setPassword(apiKey)
}

/**
 * Retrieve Todoist API key from the user keychain
 */
export function getCredentials(): { apiKey: string } {
    try {
        const apiKeyEntry = Entry.withTarget('user', SERVICE_NAME, API_KEY_ACCOUNT)
        const apiKey = apiKeyEntry.getPassword()
        
        if (!apiKey) {
            throw new Error('API key not found in keychain')
        }

        return { apiKey }
    } catch (error) {
        throw new Error(`Failed to retrieve credentials from keychain: ${error}`)
    }
}

/**
 * Check if credentials exist in the user keychain
 */
export function hasCredentials(): boolean {
    try {
        const apiKeyEntry = Entry.withTarget('user', SERVICE_NAME, API_KEY_ACCOUNT)
        const apiKey = apiKeyEntry.getPassword()
        return Boolean(apiKey && apiKey.trim())
    } catch {
        return false
    }
}

/**
 * Remove API key from the user keychain
 */
export function clearCredentials(): void {
    try {
        const apiKeyEntry = Entry.withTarget('user', SERVICE_NAME, API_KEY_ACCOUNT)
        apiKeyEntry.deletePassword()
    } catch {
        // Ignore if not found
    }
}
