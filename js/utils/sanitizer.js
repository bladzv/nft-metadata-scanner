/**
 * @module sanitizer
 * @description XSS prevention utilities for safe content rendering.
 * All user-provided or API-sourced text must pass through these
 * functions before being inserted into the DOM.
 */

/**
 * Sanitizes a string for safe insertion as text content.
 * Uses the browser's own text node encoding to neutralize HTML.
 * @param {string} text - Untrusted text to sanitize
 * @returns {string} HTML-entity-encoded safe string
 */
export function sanitizeText(text) {
    if (typeof text !== 'string') {
        return '';
    }
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Safely sets text content on a DOM element.
 * Always use this instead of innerHTML for user/API data.
 * @param {HTMLElement} element - Target element
 * @param {string} text - Untrusted text to display
 */
export function safeSetText(element, text) {
    if (!(element instanceof HTMLElement)) {
        return;
    }
    element.textContent = typeof text === 'string' ? text : String(text ?? '');
}

/**
 * Truncates text to a maximum length with ellipsis.
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum character count
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 200) {
    if (typeof text !== 'string') {
        return '';
    }
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength)}…`;
}
