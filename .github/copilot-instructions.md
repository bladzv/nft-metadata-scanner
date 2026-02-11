# NFT Metadata Scanner - AI Coding Guidelines

## Project Overview
Static web application for secure NFT metadata validation. Client-side only, no backend. Validates URLs, scans for malware via VirusTotal API, parses metadata (Enjin/ERC-721/ERC-1155 standards), and safely displays media.

## Architecture
- **Frontend:** Vanilla ES6+ JavaScript, HTML5, CSS3
- **Structure:** Modular (`validators/`, `fetchers/`, `ui/`, `utils/`)
- **APIs:** VirusTotal v3 (4 req/min free tier), IPFS gateways, CORS proxies
- **Security:** OWASP Top 10 compliant, strict CSP, XSS prevention

## Critical Patterns

### URL Validation
```javascript
// Reject dangerous schemes, enforce HTTPS/IPFS
if (!['https:', 'ipfs:'].includes(url.protocol)) {
    return { valid: false, reason: 'Only HTTPS/IPFS allowed' };
}
```

### XSS Prevention
```javascript
// Always sanitize displayed content
element.textContent = userInput; // Safe
// Never: element.innerHTML = userInput;
```

### API Rate Limiting
```javascript
// Client-side rate limiter for VirusTotal
await rateLimiter.waitForSlot(); // 4 per minute max
```

### Error Handling
```javascript
// Log structured errors, show user-friendly messages
console.error('[NFT-Scanner]', { type: 'ValidationError', context: data });
throw new Error('User-friendly message');
```

## Development Workflow
- **LOG/SUCCESS:** Track changes in sessions
- **START:** Reset session tracking
- **END:** Generate PR descriptions
- **Testing:** Manual cross-browser testing (Chrome, Firefox, Safari, Edge)
- **Security:** Validate every change against OWASP Top 10

## Key Files
- `docs/PRD-NFT-Metadata-Scanner.md` - Requirements
- `docs/PROJECT-MANAGEMENT-PLAN.md` - Project structure
- `ai-instructions.md` - Detailed development guide

## Security Requirements
- Content Security Policy in HTML meta tags
- Input validation before any network requests
- Subresource Integrity for CDN resources
- No sensitive data in localStorage/sessionStorage
- HTTPS enforcement for all external requests

## Code Standards
- JSDoc for all public functions
- ESLint Airbnb style guide
- Functions <50 lines, files <300 lines
- `const`/`let` only, no `var`
- Async/await over promises for readability