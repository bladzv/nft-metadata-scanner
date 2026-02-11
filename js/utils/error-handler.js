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
 * @param {Error|string} error - The error to translate
 * @returns {string} User-friendly error message
 */
export function getUserMessage(error) {
    const msg = error instanceof Error ? error.message : String(error);

    const messageMap = {
        'Failed to fetch': 'Could not connect to the server. Please check the URL and try again.',
        'NetworkError': 'A network error occurred. Please check your connection.',
        'AbortError': 'The request timed out. Please try again.',
        'TypeError': 'An unexpected error occurred. Please try a different URL.',
    };

    for (const [key, userMsg] of Object.entries(messageMap)) {
        if (msg.includes(key)) {
            return userMsg;
        }
    }

    return msg;
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
