/**
 * @module url-validator
 * @description Validates URLs for security and format compliance.
 * Enforces HTTPS/IPFS-only, rejects dangerous schemes, and prevents
 * SSRF by blocking private IPs and cloud metadata endpoints.
 */

import { isIPFSUrl, convertToHTTPGateway } from '../utils/ipfs-utils.js';
import { logSecurity } from '../utils/error-handler.js';

/** @type {number} Maximum allowed URL length */
const MAX_URL_LENGTH = 2048;

/** @type {string[]} Schemes that must be rejected outright */
const DANGEROUS_SCHEMES = ['data:', 'javascript:', 'file:', 'about:', 'blob:', 'ftp:'];

/** @type {RegExp[]} Patterns for private / reserved IP addresses (SSRF prevention) */
const PRIVATE_IP_PATTERNS = [
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^0\.0\.0\.0/,
    /^169\.254\./,           // link-local
    /^\[?::1\]?/,            // IPv6 loopback
    /^\[?fe80:/i,            // IPv6 link-local
    /^\[?fc00:/i,            // IPv6 unique-local
];

/** @type {string[]} Hostnames to block (SSRF / metadata endpoints) */
const BLOCKED_HOSTNAMES = [
    'localhost',
    'metadata.google.internal',
    'metadata.internal',
];

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the URL passed all checks
 * @property {string} [reason] - Why validation failed (only when valid === false)
 * @property {string} [resolvedUrl] - The HTTPS URL to use for fetching (IPFS converted)
 * @property {string} [protocol] - Detected protocol ('https' or 'ipfs')
 */

/**
 * Validates a URL for security and format compliance.
 * Rejects dangerous schemes, enforces HTTPS/IPFS, and blocks SSRF targets.
 * @param {string} url - URL to validate
 * @returns {ValidationResult} Validation result with reason on failure
 */
export function validateURL(url) {
    // Type check
    if (typeof url !== 'string' || url.trim().length === 0) {
        return { valid: false, reason: 'Please enter a URL' };
    }

    const trimmed = url.trim();

    // Length check
    if (trimmed.length > MAX_URL_LENGTH) {
        return { valid: false, reason: `URL exceeds maximum length of ${MAX_URL_LENGTH} characters` };
    }

    // Block dangerous schemes early (before URL parsing to catch javascript: etc.)
    const lowerUrl = trimmed.toLowerCase();
    for (const scheme of DANGEROUS_SCHEMES) {
        if (lowerUrl.startsWith(scheme)) {
            logSecurity('Dangerous URL scheme blocked', { url: trimmed, scheme });
            return { valid: false, reason: 'This URL uses a blocked protocol' };
        }
    }

    // Handle IPFS URLs
    if (isIPFSUrl(trimmed)) {
        try {
            const { url: httpUrl } = convertToHTTPGateway(trimmed);
            return { valid: true, resolvedUrl: httpUrl, protocol: 'ipfs' };
        } catch (err) {
            return { valid: false, reason: err.message };
        }
    }

    // Parse as standard URL
    let urlObj;
    try {
        urlObj = new URL(trimmed);
    } catch {
        return { valid: false, reason: 'Invalid URL format. Please include the full URL with https://' };
    }

    // Enforce HTTPS only (non-IPFS)
    if (urlObj.protocol !== 'https:') {
        return { valid: false, reason: 'Only HTTPS URLs are allowed for security' };
    }

    // SSRF: block private/reserved IPs
    const hostname = urlObj.hostname;
    if (BLOCKED_HOSTNAMES.includes(hostname.toLowerCase())) {
        logSecurity('Blocked hostname', { url: trimmed, hostname });
        return { valid: false, reason: 'This hostname is not allowed' };
    }

    for (const pattern of PRIVATE_IP_PATTERNS) {
        if (pattern.test(hostname)) {
            logSecurity('Private IP blocked', { url: trimmed, hostname });
            return { valid: false, reason: 'URLs pointing to private/local addresses are not allowed' };
        }
    }

    return { valid: true, resolvedUrl: trimmed, protocol: 'https' };
}
