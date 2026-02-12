/**
 * @module metadata-display
 * @description Renders parsed NFT metadata into the results panel.
 * Uses textContent exclusively for user-sourced data to prevent XSS.
 */

import { safeSetText } from '../utils/sanitizer.js';
import { getStandardLabel } from '../validators/metadata-parser.js';

/**
 * Gets additional information about a metadata standard.
 * @param {string} standard - The detected standard
 * @returns {string|null} Additional information or null
 */
function getStandardInfo(standard) {
    const info = {
        enjin: 'Gaming-focused metadata with media arrays and attributes',
        erc721: 'Standard NFT metadata with single image and attributes array',
        erc1155: 'Multi-token standard with decimals for fungible tokens',
        unknown: 'Non-standard metadata format'
    };
    return info[standard] || null;
}

/**
 * Shows the results section.
 * @param {boolean} visible - Whether to show results
 */
export function showResults(visible) {
    const section = document.getElementById('results-section');
    if (section) {
        section.hidden = !visible;
    }
}

/**
 * Resets the metadata panel to its placeholder state.
 */
export function resetMetadataPanel() {
    const content = document.getElementById('metadata-content');
    const rawDetails = document.getElementById('raw-json-details');
    const rawContent = document.getElementById('raw-json-content');

    if (content) {
        content.innerHTML = '';
        const p = document.createElement('p');
        p.className = 'placeholder-text';
        p.textContent = 'Metadata will appear here after scanning.';
        content.appendChild(p);
    }

    if (rawDetails) rawDetails.hidden = true;
    if (rawContent) rawContent.textContent = '';
}

/**
 * Renders parsed metadata into the metadata panel.
 * All values set via textContent (XSS-safe).
 * @param {import('../validators/metadata-parser.js').ParseResult} result - Parsed metadata
 */
export function renderMetadata(result) {
    const content = document.getElementById('metadata-content');
    if (!content) return;

    content.innerHTML = '';

    // Standard badge with enhanced information
    const badge = createField('Standard', null);
    const badgeContainer = document.createElement('div');
    badgeContainer.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;';

    const badgeSpan = document.createElement('span');
    badgeSpan.className = `metadata-badge metadata-badge-${result.standard}`;
    badgeSpan.textContent = getStandardLabel(result.standard);
    badgeContainer.appendChild(badgeSpan);

    // Add standard-specific information
    const standardInfo = getStandardInfo(result.standard);
    if (standardInfo) {
        const infoSpan = document.createElement('span');
        infoSpan.className = 'metadata-standard-info';
        infoSpan.textContent = standardInfo;
        badgeContainer.appendChild(infoSpan);
    }

    badge.querySelector('.metadata-value')?.remove();
    badge.appendChild(badgeContainer);
    content.appendChild(badge);

    // Name
    if (result.name) {
        content.appendChild(createField('Name', result.name));
    }

    // Description
    if (result.description) {
        content.appendChild(createField('Description', result.description));
    }

    // Image URL
    if (result.image) {
        content.appendChild(createField('Image URL', result.image));
    }

    // Properties (Enjin)
    if (result.properties && typeof result.properties === 'object') {
        const propsEl = createField('Properties', '');
        const list = document.createElement('ul');
        list.style.cssText = 'list-style: none; padding: 0; margin-top: 0.25rem;';

        for (const [key, value] of Object.entries(result.properties)) {
            const li = document.createElement('li');
            li.style.cssText = 'font-size: 0.875rem; color: var(--color-text-muted); padding: 0.125rem 0;';
            const keySpan = document.createElement('strong');
            keySpan.textContent = `${key}: `;
            li.appendChild(keySpan);
            const valSpan = document.createElement('span');
            valSpan.textContent = String(value);
            li.appendChild(valSpan);
            list.appendChild(li);
        }

        // Replace the placeholder value with the list
        const valueEl = propsEl.querySelector('.metadata-value');
        if (valueEl) {
            valueEl.textContent = '';
            valueEl.appendChild(list);
        }
        content.appendChild(propsEl);
    }

    // Attributes (ERC-721/1155)
    if (Array.isArray(result.attributes) && result.attributes.length > 0) {
        const attrsEl = createField('Attributes', '');
        const list = document.createElement('ul');
        list.style.cssText = 'list-style: none; padding: 0; margin-top: 0.25rem;';

        for (const attr of result.attributes) {
            const li = document.createElement('li');
            li.style.cssText = 'font-size: 0.875rem; color: var(--color-text-muted); padding: 0.125rem 0;';
            const traitType = attr.trait_type ?? attr.key ?? 'trait';
            const traitValue = attr.value ?? '';
            const keySpan = document.createElement('strong');
            keySpan.textContent = `${traitType}: `;
            li.appendChild(keySpan);
            const valSpan = document.createElement('span');
            valSpan.textContent = String(traitValue);
            li.appendChild(valSpan);
            list.appendChild(li);
        }

        const valueEl = attrsEl.querySelector('.metadata-value');
        if (valueEl) {
            valueEl.textContent = '';
            valueEl.appendChild(list);
        }
        content.appendChild(attrsEl);
    }

    // Warnings
    if (result.warnings && result.warnings.length > 0) {
        const warningEl = document.createElement('div');
        warningEl.style.cssText = 'margin-top: 0.5rem; padding: 0.5rem; border-radius: 0.375rem; background: rgba(245, 158, 11, 0.1); font-size: 0.875rem; color: var(--color-warning);';
        for (const w of result.warnings) {
            const p = document.createElement('p');
            p.style.margin = '0.125rem 0';
            p.textContent = `⚠ ${w}`;
            warningEl.appendChild(p);
        }
        content.appendChild(warningEl);
    }

    // Raw JSON
    renderRawJSON(result.raw);
}

/**
 * Creates a labeled metadata field element (XSS-safe via textContent).
 * @param {string} label - Field label
 * @param {string|null} value - Field value
 * @returns {HTMLDivElement} Metadata field element
 */
function createField(label, value) {
    const field = document.createElement('div');
    field.className = 'metadata-field';

    const labelEl = document.createElement('span');
    labelEl.className = 'metadata-label';
    labelEl.textContent = label;
    field.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.className = 'metadata-value';
    if (value !== null) {
        valueEl.textContent = value;
    }
    field.appendChild(valueEl);

    return field;
}

/**
 * Renders raw JSON in the collapsible details panel.
 * @param {Object} raw - Raw metadata object
 */
function renderRawJSON(raw) {
    const details = document.getElementById('raw-json-details');
    const codeEl = document.getElementById('raw-json-content');

    if (!details || !codeEl || !raw) return;

    // textContent prevents XSS in the JSON display
    codeEl.textContent = JSON.stringify(raw, null, 2);
    details.hidden = false;
}
