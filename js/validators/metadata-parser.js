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

    // Check for Enjin characteristics FIRST (higher priority)
    // Enjin: has media array or fallback_image (most reliable indicators)
    const hasMediaArray = Array.isArray(data.media) && data.media.length > 0;
    const hasFallbackImage = typeof data.fallback_image === 'string' && data.fallback_image.trim();
    const hasProperties = data.properties && typeof data.properties === 'object' && !Array.isArray(data.properties);

    if (hasMediaArray || hasFallbackImage || hasProperties) {
        return 'enjin';
    }

    // ERC-1155: has decimals field (fungible token indicator)
    if (typeof data.decimals === 'number' || data.decimals === 0) {
        return 'erc1155';
    }

    // ERC-721: has attributes array (but not detected as Enjin above)
    if (Array.isArray(data.attributes)) {
        return 'erc721';
    }

    // Has minimum name + image — treat as generic ERC-721
    if (data.name && data.image) {
        return 'erc721';
    }

    return 'unknown';
}

/**
 * Gets the primary image URL for a metadata object based on its standard.
 * @param {Object} data - Parsed metadata object
 * @param {MetadataStandard} standard - Detected standard
 * @returns {string|null} Image URL or null if not found
 */
function getImageUrl(data, standard) {
    // Check root-level image first (works for all standards)
    if (data.image && typeof data.image === 'string') {
        return data.image;
    }

    if (standard === 'enjin') {
        // Enjin-specific image sources
        if (Array.isArray(data.media) && data.media.length > 0 && data.media[0].url) {
            return data.media[0].url;
        }

        if (data.fallback_image && typeof data.fallback_image === 'string') {
            return data.fallback_image;
        }

        // Legacy Enjin format with properties
        if (data.properties && typeof data.properties === 'object') {
            if (data.properties.thumbnail && typeof data.properties.thumbnail === 'string') {
                return data.properties.thumbnail;
            }
            if (data.properties.fallback_image && typeof data.properties.fallback_image === 'string') {
                return data.properties.fallback_image;
            }
        }
    }

    return null;
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

export function validateMetadata(data) {
    const warnings = [];
    const standard = detectStandard(data);

    // Required fields: name is mandatory for all standards
    if (!data.name || typeof data.name !== 'string') {
        return {
            valid: false,
            standard,
            raw: data,
            warnings,
            reason: 'Missing required field: "name"',
        };
    }

    // Image validation: different standards have different image field locations
    const imageUrl = getImageUrl(data, standard);
    if (!imageUrl) {
        return {
            valid: false,
            standard,
            raw: data,
            warnings,
            reason: 'Missing required field: "image" (or equivalent media/fallback_image)',
        };
    }

    // Optional field checks (warnings, not failures)
    if (!data.description) {
        warnings.push('Missing optional field: "description"');
    }

    if (standard === 'enjin') {
        // Enjin should have media array or fallback_image
        if (!Array.isArray(data.media) && !data.fallback_image && !(data.properties && (data.properties.thumbnail || data.properties.fallback_image))) {
            warnings.push('Enjin metadata typically includes "media" array or "fallback_image"');
        }
    }

    if (standard === 'erc721' && !Array.isArray(data.attributes)) {
        warnings.push('ERC-721 metadata typically includes "attributes" array');
    }

    return {
        valid: true,
        standard,
        name: String(data.name),
        description: data.description ? String(data.description) : undefined,
        image: imageUrl,
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

/**
 * Extracts all URLs from metadata based on the detected standard.
 * @param {Object} data - Parsed metadata object
 * @param {MetadataStandard} standard - Detected metadata standard
 * @returns {Array<{url: string, field: string, type: string}>} Array of URL objects with context
 */
export function extractAllUrls(data, standard) {
    const urls = [];

    if (!data || typeof data !== 'object') {
        return urls;
    }

    // Helper function to add URL if valid
    const addUrl = (url, field, type) => {
        if (typeof url === 'string' && url.trim()) {
            urls.push({ url: url.trim(), field, type });
        }
    };

    // Common fields across all standards
    addUrl(data.image, 'image', 'media');
    addUrl(data.external_url, 'external_url', 'external');
    addUrl(data.animation_url, 'animation_url', 'media');

    if (standard === 'enjin') {
        // Enjin-specific fields at root level
        addUrl(data.fallback_image, 'fallback_image', 'media');

        // Media array at root level
        if (Array.isArray(data.media)) {
            data.media.forEach((media, index) => {
                if (typeof media === 'object' && media.url) {
                    addUrl(media.url, `media[${index}].url`, 'media');
                }
            });
        }

        // Legacy Enjin format with properties
        if (data.properties && typeof data.properties === 'object') {
            addUrl(data.properties.thumbnail, 'properties.thumbnail', 'media');
            addUrl(data.properties.fallback_image, 'properties.fallback_image', 'media');

            // Media array in properties (legacy)
            if (Array.isArray(data.properties.media)) {
                data.properties.media.forEach((media, index) => {
                    if (typeof media === 'object' && media.url) {
                        addUrl(media.url, `properties.media[${index}].url`, 'media');
                    }
                });
            }
        }
    } else if (standard === 'erc721' || standard === 'erc1155') {
        // ERC-721/1155 attributes (could contain URLs)
        if (Array.isArray(data.attributes)) {
            data.attributes.forEach((attr, index) => {
                if (typeof attr === 'object' && attr.value && typeof attr.value === 'string') {
                    // Check if value looks like a URL
                    if (attr.value.startsWith('http') || attr.value.startsWith('ipfs://')) {
                        addUrl(attr.value, `attributes[${index}].value`, 'attribute');
                    }
                }
            });
        }
    }

    return urls;
}
