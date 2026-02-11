/**
 * @module metadata-parser
 * @description Parses and validates NFT metadata JSON against known standards.
 * Detects Enjin, ERC-721, and ERC-1155 formats, validates required fields,
 * and extracts media URLs for downstream processing.
 */

/**
 * @typedef {'enjin'|'erc721'|'erc1155'|'unknown'} MetadataStandard
 */

/**
 * @typedef {Object} ParseResult
 * @property {boolean} valid - Whether the metadata has required fields
 * @property {MetadataStandard} standard - Detected metadata standard
 * @property {string} [name] - NFT name
 * @property {string} [description] - NFT description
 * @property {string} [image] - Image URL from metadata
 * @property {Object} [properties] - Enjin-style properties
 * @property {Array} [attributes] - ERC-721/1155-style attributes
 * @property {Object} raw - Original parsed JSON
 * @property {string[]} warnings - Non-fatal issues found
 * @property {string} [reason] - Why validation failed (when valid === false)
 */

/**
 * Detects which NFT metadata standard a JSON object conforms to.
 * @param {Object} data - Parsed JSON metadata
 * @returns {MetadataStandard} Detected standard
 */
function detectStandard(data) {
    if (!data || typeof data !== 'object') {
        return 'unknown';
    }

    // Enjin: has "properties" object (not "attributes" array)
    const hasProperties = data.properties && typeof data.properties === 'object' && !Array.isArray(data.properties);
    const hasAttributes = Array.isArray(data.attributes);

    if (hasProperties && !hasAttributes) {
        return 'enjin';
    }

    // ERC-1155: has decimals field (fungible token indicator)
    if (typeof data.decimals === 'number' || data.decimals === 0) {
        return 'erc1155';
    }

    // ERC-721: has attributes array
    if (hasAttributes) {
        return 'erc721';
    }

    // Has minimum name + image — treat as generic ERC-721
    if (data.name && data.image) {
        return 'erc721';
    }

    return 'unknown';
}

/**
 * Parses raw JSON text into a metadata object and validates it.
 * @param {string} jsonText - Raw JSON string from fetch response
 * @returns {ParseResult} Parsed and validated result
 */
export function parseMetadata(jsonText) {
    let data;

    try {
        data = JSON.parse(jsonText);
    } catch {
        return {
            valid: false,
            standard: 'unknown',
            raw: null,
            warnings: [],
            reason: 'Invalid JSON — could not parse the metadata',
        };
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return {
            valid: false,
            standard: 'unknown',
            raw: data,
            warnings: [],
            reason: 'Metadata must be a JSON object, not an array or primitive',
        };
    }

    return validateMetadata(data);
}

/**
 * Validates a parsed metadata object against required fields.
 * @param {Object} data - Parsed JSON metadata object
 * @returns {ParseResult} Validation result
 */
export function validateMetadata(data) {
    const warnings = [];
    const standard = detectStandard(data);

    // Required fields: name and image are mandatory for all standards
    if (!data.name || typeof data.name !== 'string') {
        return {
            valid: false,
            standard,
            raw: data,
            warnings,
            reason: 'Missing required field: "name"',
        };
    }

    if (!data.image || typeof data.image !== 'string') {
        return {
            valid: false,
            standard,
            raw: data,
            warnings,
            reason: 'Missing required field: "image"',
        };
    }

    // Optional field checks (warnings, not failures)
    if (!data.description) {
        warnings.push('Missing optional field: "description"');
    }

    if (standard === 'enjin' && !data.properties) {
        warnings.push('Enjin metadata typically includes "properties"');
    }

    if (standard === 'erc721' && !Array.isArray(data.attributes)) {
        warnings.push('ERC-721 metadata typically includes "attributes" array');
    }

    return {
        valid: true,
        standard,
        name: String(data.name),
        description: data.description ? String(data.description) : undefined,
        image: String(data.image),
        properties: data.properties ?? undefined,
        attributes: data.attributes ?? undefined,
        raw: data,
        warnings,
    };
}

/**
 * Returns a human-readable label for a metadata standard.
 * @param {MetadataStandard} standard - Detected standard
 * @returns {string} Display label
 */
export function getStandardLabel(standard) {
    const labels = {
        enjin: 'Enjin Blockchain',
        erc721: 'ERC-721',
        erc1155: 'ERC-1155',
        unknown: 'Unknown Standard',
    };
    return labels[standard] ?? 'Unknown Standard';
}
