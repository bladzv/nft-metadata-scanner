/**
 * @module ipfs-utils
 * @description Utilities for converting and validating IPFS URLs.
 * Handles ipfs:// protocol, HTTP gateway URLs, and CID validation.
 */

/** @type {string[]} Ordered list of IPFS gateways to try */
const IPFS_GATEWAYS = [
    'https://ipfs.io/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
];

/** Default gateway used for conversions */
const DEFAULT_GATEWAY = IPFS_GATEWAYS[0];

/** Regex for CIDv0 (Qm-prefixed, base58, 46 chars) */
const CID_V0_REGEX = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;

/** Regex for CIDv1 (base32-encoded, starts with b) */
const CID_V1_REGEX = /^b[a-z2-7]{58,}$/i;

/**
 * Checks if a string looks like a valid IPFS CID.
 * Supports both CIDv0 (Qm...) and CIDv1 (bafy...) formats.
 * @param {string} hash - The hash to validate
 * @returns {boolean} True if the hash matches a known CID pattern
 */
export function isValidCID(hash) {
    if (typeof hash !== 'string' || hash.length === 0) {
        return false;
    }
    return CID_V0_REGEX.test(hash) || CID_V1_REGEX.test(hash);
}

/**
 * Checks whether a URL is an IPFS URL (protocol or gateway).
 * @param {string} url - URL to check
 * @returns {boolean} True if the URL is IPFS-related
 */
export function isIPFSUrl(url) {
    if (typeof url !== 'string') {
        return false;
    }
    const lower = url.toLowerCase();
    if (lower.startsWith('ipfs://')) {
        return true;
    }
    return IPFS_GATEWAYS.some((gw) => lower.startsWith(gw.toLowerCase()));
}

/**
 * Extracts the CID (and optional path) from an IPFS URL.
 * Supports ipfs:// protocol and HTTP gateway formats.
 * @param {string} url - IPFS URL
 * @returns {string|null} CID with optional path, or null if extraction fails
 */
export function extractCID(url) {
    if (typeof url !== 'string') {
        return null;
    }

    // Handle ipfs:// protocol
    if (url.startsWith('ipfs://')) {
        const cidPath = url.slice('ipfs://'.length);
        return cidPath || null;
    }

    // Handle HTTP gateway URLs
    for (const gateway of IPFS_GATEWAYS) {
        if (url.startsWith(gateway)) {
            const cidPath = url.slice(gateway.length);
            return cidPath || null;
        }
    }

    return null;
}

/**
 * Converts an IPFS URL to an HTTP gateway URL.
 * If already an HTTP gateway URL, returns as-is.
 * @param {string} ipfsUrl - IPFS URL to convert
 * @returns {{ url: string, gateway: string }} Converted URL and gateway used
 * @throws {Error} If the URL format is not a recognized IPFS URL
 */
export function convertToHTTPGateway(ipfsUrl) {
    if (typeof ipfsUrl !== 'string') {
        throw new Error('Invalid IPFS URL format');
    }

    // Already an HTTP gateway URL — return as-is
    for (const gateway of IPFS_GATEWAYS) {
        if (ipfsUrl.startsWith(gateway)) {
            return { url: ipfsUrl, gateway };
        }
    }

    // Convert ipfs:// protocol
    if (ipfsUrl.startsWith('ipfs://')) {
        const cidPath = ipfsUrl.slice('ipfs://'.length);
        if (!cidPath) {
            throw new Error('IPFS URL is missing a CID');
        }
        return {
            url: `${DEFAULT_GATEWAY}${cidPath}`,
            gateway: DEFAULT_GATEWAY,
        };
    }

    throw new Error('URL is not a recognized IPFS format');
}

/**
 * Returns the list of available IPFS gateways.
 * @returns {string[]} Array of gateway base URLs
 */
export function getGateways() {
    return [...IPFS_GATEWAYS];
}
