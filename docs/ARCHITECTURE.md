# Architecture Guide

## Overview

The NFT Metadata Scanner is a client-side static web application built with vanilla JavaScript, HTML5, and CSS3. It provides secure validation and preview of NFT metadata and associated media from URLs, with a focus on Enjin Blockchain NFT standards.

## Architecture Principles

- **Client-Side Only**: No backend server; all processing happens in the browser
- **Security-First**: OWASP Top 10 compliant with strict input validation and XSS prevention
- **Modular Design**: ES6 modules with clear separation of concerns
- **Progressive Enhancement**: Core functionality works without JavaScript enhancements
- **Accessibility**: WCAG 2.1 Level AA compliant

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Input    │───▶│  URL Validation │───▶│  Metadata Fetch │
│   (HTML Form)   │    │   & Security    │    │   & Parsing     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  VirusTotal     │───▶│   Media Fetch   │───▶│   Safe Display  │
│   API Scan      │    │   & Validation  │    │   & Preview     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Component Architecture

### Core Modules

#### 1. Main Application (`js/main.js`)
- **Purpose**: Orchestrates the entire scanning pipeline
- **Responsibilities**:
  - Initialize UI components
  - Coordinate pipeline execution
  - Handle global error states
  - Manage application state

#### 2. Utility Modules (`js/utils/`)
- **sanitizer.js**: XSS-safe text and HTML sanitization
- **error-handler.js**: Structured error logging and user-friendly messages
- **ipfs-utils.js**: IPFS CID detection and gateway URL conversion

#### 3. Validators (`js/validators/`)
- **url-validator.js**: URL format and security validation
- **metadata-parser.js**: NFT standard detection and schema validation
- **security-scanner.js**: VirusTotal API integration with rate limiting

#### 4. Fetchers (`js/fetchers/`)
- **metadata-fetcher.js**: JSON metadata retrieval with CORS fallback
- **media-fetcher.js**: Media download with size/type validation

#### 5. UI Components (`js/ui/`)
- **status-display.js**: Pipeline progress and status updates
- **metadata-display.js**: XSS-safe metadata rendering
- **media-display.js**: Safe media preview and cleanup

### Data Flow

1. **Input Validation**
   - User enters URL in form
   - URL validated for format and security
   - Rejected if dangerous protocols or SSRF attempts

2. **Security Scanning**
   - URL submitted to VirusTotal API
   - Rate limiting enforced (4 requests/minute)
   - Results cached in sessionStorage

3. **Metadata Retrieval**
   - Direct fetch attempt
   - CORS proxy fallback if needed
   - JSON validation and parsing

4. **Media Processing**
   - Media URLs extracted from metadata
   - Size and type validation
   - Blob download with object URL creation

5. **Safe Display**
   - All content sanitized before rendering
   - CSP prevents script execution
   - Memory cleanup prevents leaks

## Security Architecture

### Defense in Depth

#### 1. Input Validation Layer
- URL scheme restrictions (HTTPS/IPFS only)
- SSRF prevention (block localhost/private IPs)
- Length limits and format validation

#### 2. Network Security Layer
- HTTPS enforcement
- CORS proxy for cross-origin requests
- Request timeouts and size limits

#### 3. Content Security Layer
- Strict CSP headers
- XSS prevention through sanitization
- Safe media handling with blob URLs

#### 4. API Security Layer
- Client-side rate limiting
- API key protection (memory-only storage)
- Response validation

### Threat Mitigation

| OWASP Category | Mitigation Strategy |
|----------------|-------------------|
| A01:2021 - Broken Access Control | URL validation, SSRF prevention |
| A02:2021 - Cryptographic Failures | HTTPS enforcement, no sensitive storage |
| A03:2021 - Injection | XSS sanitization, CSP, safe DOM manipulation |
| A04:2021 - Insecure Design | Rate limiting, input validation, error handling |
| A05:2021 - Security Misconfiguration | CSP, SRI, secure defaults |
| A06:2021 - Vulnerable Components | Minimal dependencies, regular updates |
| A08:2021 - Integrity Failures | SRI, response validation |
| A09:2021 - Logging Failures | Structured security logging |
| A10:2021 - SSRF | URL validation, IP blocking |

## Performance Considerations

### Optimization Strategies

- **Lazy Loading**: Media loaded only when requested
- **Caching**: VirusTotal results cached in sessionStorage
- **Debouncing**: User input debounced to reduce API calls
- **Memory Management**: Object URLs revoked after use
- **Progressive Rendering**: UI updates incrementally

### Resource Limits

- **File Size**: 32MB limit for VirusTotal uploads
- **Request Timeout**: 10 seconds for all network requests
- **Rate Limiting**: 4 VirusTotal requests per minute
- **URL Length**: 2048 character maximum

## Deployment Architecture

### Static Hosting
- **Platform**: GitHub Pages
- **Build Process**: None (vanilla JavaScript)
- **CDN**: GitHub's CDN infrastructure
- **SSL**: Automatic HTTPS via GitHub Pages

### File Structure
```
nft-metadata-scanner/
├── index.html              # Main application page
├── css/
│   ├── main.css           # Core styles and variables
│   ├── components.css     # UI component styles
│   └── responsive.css     # Mobile-first responsive rules
├── js/
│   ├── main.js            # Application entry point
│   ├── utils/             # Utility functions
│   ├── validators/        # Input validation modules
│   ├── fetchers/          # Network request modules
│   └── ui/                # UI component modules
├── docs/                  # Documentation
└── README.md              # Project overview
```

## Browser Compatibility

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Feature Requirements
- ES6 modules support
- Fetch API
- URL API
- Blob API
- sessionStorage

## Error Handling Architecture

### Error Types
- **ValidationError**: Invalid user input
- **NetworkError**: Failed API requests
- **SecurityError**: Blocked security violations
- **ParseError**: Invalid metadata format

### Error Recovery
- **Retry Logic**: Automatic retry for transient failures
- **Fallbacks**: CORS proxy fallback for cross-origin issues
- **Graceful Degradation**: Continue operation when non-critical features fail
- **User Feedback**: Clear error messages with actionable guidance

## Future Architecture Considerations

### Potential Enhancements
- **Service Worker**: Offline caching and background sync
- **WebAssembly**: Performance-critical parsing operations
- **WebRTC**: Peer-to-peer metadata sharing
- **IndexedDB**: Enhanced local caching

### Scalability
- **Modular Architecture**: Easy to add new NFT standards
- **Plugin System**: Extensible validator and fetcher interfaces
- **Progressive Loading**: Load features on demand

## Development Workflow

### Code Organization
- **Feature Branches**: `feature/[description]`
- **Bug Fixes**: `fix/[description]`
- **Security**: `security/[description]`

### Quality Assurance
- **ESLint**: Airbnb style guide
- **Manual Testing**: Cross-browser validation
- **Security Review**: OWASP checklist verification
- **Accessibility**: WCAG compliance testing

This architecture ensures a secure, performant, and maintainable NFT metadata scanning application that can safely handle user-provided URLs and display NFT content without compromising browser security.