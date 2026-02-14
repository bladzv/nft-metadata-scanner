/**
 * @module error-handler
 * @description Centralized error handling and structured logging.
 * Provides user-friendly messages while logging technical details
 * to the browser console for debugging.
 */

/** @type {string} Log prefix for all scanner messages */
const LOG_PREFIX = '[NFT-Scanner]';

/**
 * Logs a structured error to the browser console.
 * Never exposes stack traces or sensitive data in production.
 * @param {string} type - Error category (e.g., 'ValidationError', 'NetworkError')
 * @param {string} message - Human-readable error description
 * @param {Object} [context={}] - Additional context for debugging
 */
export function logError(type, message, context = {}) {
    console.error(LOG_PREFIX, {
        timestamp: new Date().toISOString(),
        type,
        message,
        context,
    });
}

/**
 * Logs an informational message to the browser console.
 * @param {string} message - Log message
 * @param {Object} [context={}] - Additional context
 */
export function logInfo(message, context = {}) {
    console.log(LOG_PREFIX, {
        timestamp: new Date().toISOString(),
        message,
        context,
    });
}

/**
 * Logs a security-relevant event (blocked URL, XSS attempt, etc.).
 * @param {string} message - Description of the security event
 * @param {Object} [context={}] - Additional context
 */
export function logSecurity(message, context = {}) {
    console.warn(`${LOG_PREFIX} [SECURITY]`, {
        timestamp: new Date().toISOString(),
        message,
        context,
    });
}

/**
 * Maps internal error types to user-friendly messages.
 * Each message explains what happened, why, and how to fix it.
 * Never exposes sensitive details or system information.
 * @param {Error|string} error - The error to translate
 * @returns {string} User-friendly error message
 */
export function getUserMessage(error) {
    const msg = error instanceof Error ? error.message : String(error);

    // Comprehensive message mapping aligned with UI/UX best practices:
    // Each message: 1) Explains what happened 2) Why it happened 3) How to fix
    const messageMap = {
        'Failed to fetch': 'The URL could not be reached. Check that the URL is correct and the server is accessible.',
        'NetworkError': 'Network connection failed. Please verify your internet connection and try again.',
        'AbortError': 'The request took too long to complete. Please check your internet speed and try again.',
        'TypeError': 'The server response was not in the expected format. The URL may not be a valid NFT metadata endpoint.',
        'Invalid URL format': 'Please enter a complete URL starting with https:// (for HTTPS) or ipfs:// (for IPFS).',
        'Only HTTPS':  'Only HTTPS URLs are allowed for security. IPFS URLs (ipfs://) are also supported.',
        'exceeded maximum':  'The URL is too long. Please use a shorter URL.',
        'blocked protocol': 'This URL type is not supported for security reasons. Use HTTPS or IPFS URLs only.',
        'private': 'URLs pointing to local/private networks cannot be accessed. Please use a public URL.',
        'not allowed': 'This server is blocked for security purposes. Please try a different URL.',
        'SyntaxError': 'The response contained invalid data. The URL may not point to valid NFT metadata.',
        'quota': 'The API quota has been reached. Please try again later or register for more scans.',
        'unauthorized': 'The VirusTotal API key is invalid or expired. Please check your key and try again.',
    };

    // Check for matching error patterns (case-insensitive substring match)
    for (const [key, userMsg] of Object.entries(messageMap)) {
        if (msg.toLowerCase().includes(key.toLowerCase())) {
            return userMsg;
        }
    }

    // Fallback for unmapped errors: generic but helpful
    return 'Something went wrong. Please try again or contact support if the problem persists.';
}

/**
 * Wraps an async operation with standardized error handling.
 * Returns a result tuple [data, error] to avoid try/catch boilerplate.
 * @template T
 * @param {Promise<T>} promise - The async operation
 * @returns {Promise<[T, null] | [null, Error]>} Result tuple
 */
export async function safeAsync(promise) {
    try {
        const data = await promise;
        return [data, null];
    } catch (error) {
        return [null, error instanceof Error ? error : new Error(String(error))];
    }
}
