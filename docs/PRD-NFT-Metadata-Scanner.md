# Product Requirements Document (PRD)
## NFT Media Scanner & Validator - Static Web App MVP

---

## Document Information

**Version:** 2.0 (MVP Static Web App)  
**Last Updated:** February 12, 2026  
**Author:** [Your Name]  
**Status:** Active Development  
**Project Type:** Open Source - GitHub Portfolio Project

---

## 1. Executive Summary

### 1.1 Purpose
This document outlines the requirements for a static web application that validates NFT metadata and associated media from URLs, with primary focus on Enjin Blockchain NFT standards. The application prioritizes security, transparency, and demonstrating cybersecurity best practices for a portfolio project.

### 1.2 Objectives
- Create a client-side static web application (no backend required)
- Validate NFT metadata URLs (HTTPS and IPFS protocols)
- Parse and display NFT metadata with support for Enjin Blockchain standard
- Scan URLs and media files using free security APIs
- Provide transparent real-time feedback on all validation steps
- Demonstrate OWASP Top 10 security awareness
- Serve as portfolio piece showcasing full-stack and security skills

### 1.3 Scope Revision for MVP

**In Scope:**
- Static HTML/CSS/JavaScript web application
- Support for HTTPS and IPFS URL protocols
- VirusTotal API integration for URL and file scanning
- Enjin Blockchain NFT metadata standard support
- Generic NFT metadata standard support (ERC-721, ERC-1155)
- Client-side media display (images)
- Real-time status feedback UI
- GitHub Pages deployment

**Out of Scope (Future Phases):**
- Backend server infrastructure
- Database storage
- User authentication
- Custom domain/CDN
- Video/3D model support (Phase 2)
- Batch processing
- Non-HTTPS/IPFS protocols (Phase 2)
- Advanced content moderation beyond VirusTotal

**Budget Constraint:** $0 - All services must be free tier or open source

---

## 2. Background & Context

### 2.1 Problem Statement
Users need a simple, secure tool to preview and validate NFT metadata before minting or purchasing, especially for:
- Verifying metadata URLs are safe to visit
- Confirming media files don't contain malware
- Previewing how NFT data will appear
- Understanding Enjin Blockchain NFT structure

### 2.2 Target Users
- **Primary:** NFT creators validating their metadata before minting
- **Secondary:** Potential NFT buyers previewing assets
- **Tertiary:** Developers learning NFT standards and security
- **Audience:** Technical recruiters and hiring managers reviewing portfolio

### 2.3 NFT Metadata Standards

#### 2.3.1 Enjin Blockchain Metadata Standard (Priority)
```json
{
  "name": "Asset Name",
  "description": "Asset description",
  "image": "https://example.com/image.png",
  "properties": {
    "key": "value"
  }
}
```

#### 2.3.2 Generic Standards (Secondary Support)
- **ERC-721:** OpenSea metadata standard
- **ERC-1155:** Multi-token metadata
- **Common fields:** name, description, image, external_url, attributes

---

## 3. Functional Requirements

### 3.1 URL Input Module

**FR-1.1:** Application SHALL accept HTTPS URLs  
**Priority:** P0 (Critical)

**FR-1.2:** Application SHALL accept IPFS URLs (ipfs://, https://ipfs.io/ipfs/, https://gateway.pinata.cloud/ipfs/)  
**Priority:** P0 (Critical)

**FR-1.3:** Application SHALL display validation errors for invalid URL formats  
**Priority:** P0 (Critical)

**FR-1.4:** Application SHALL validate URL format before making any requests  
**Priority:** P0 (Critical)

**FR-1.5:** Application SHALL support paste and manual entry of URLs  
**Priority:** P0 (Critical)

**FR-1.6:** Application SHALL provide example URLs for testing  
**Priority:** P1 (High)

### 3.2 URL Security Scanning Module

**FR-2.1:** Application SHALL scan URLs using VirusTotal API before fetching  
**Priority:** P0 (Critical)

**FR-2.2:** Application SHALL display VirusTotal scan results (detections, scan date)  
**Priority:** P0 (Critical)

**FR-2.3:** Application SHALL allow user to proceed with warning if URL flagged  
**Priority:** P1 (High)

**FR-2.4:** Application SHALL handle VirusTotal API rate limits gracefully  
**Priority:** P0 (Critical)

**FR-2.5:** Application SHALL cache VirusTotal results in sessionStorage  
**Priority:** P1 (High)

**FR-2.6:** Application SHALL work without API key (public endpoint) with rate limit notice  
**Priority:** P1 (High)

### 3.3 Metadata Fetching Module

**FR-3.1:** Application SHALL fetch metadata via CORS-enabled proxy or direct request  
**Priority:** P0 (Critical)

**FR-3.2:** Application SHALL handle IPFS URLs by converting to HTTP gateway  
**Priority:** P0 (Critical)

**FR-3.3:** Application SHALL implement fetch timeout (10 seconds)  
**Priority:** P0 (Critical)

**FR-3.4:** Application SHALL validate Content-Type is application/json  
**Priority:** P1 (High)

**FR-3.5:** Application SHALL handle network errors gracefully  
**Priority:** P0 (Critical)

**FR-3.6:** Application SHALL display fetch progress  
**Priority:** P1 (High)

### 3.4 Metadata Parsing & Validation Module

**FR-4.1:** Application SHALL parse JSON metadata  
**Priority:** P0 (Critical)

**FR-4.2:** Application SHALL validate required fields for Enjin standard (name, description, image)  
**Priority:** P0 (Critical)

**FR-4.3:** Application SHALL detect and support ERC-721/ERC-1155 formats  
**Priority:** P1 (High)

**FR-4.4:** Application SHALL display parsed metadata in human-readable format  
**Priority:** P0 (Critical)

**FR-4.5:** Application SHALL display raw JSON in expandable section  
**Priority:** P0 (Critical)

**FR-4.6:** Application SHALL sanitize all displayed text to prevent XSS  
**Priority:** P0 (Critical)

**FR-4.7:** Application SHALL validate image URL exists in metadata  
**Priority:** P0 (Critical)

### 3.5 Media URL Security Scanning Module

**FR-5.1:** Application SHALL scan media URL using VirusTotal API  
**Priority:** P0 (Critical)

**FR-5.2:** Application SHALL display media URL scan results  
**Priority:** P0 (Critical)

**FR-5.3:** Application SHALL allow user to proceed with warning if media URL flagged  
**Priority:** P1 (High)

**FR-5.4:** Application SHALL handle unsupported media types gracefully  
**Priority:** P1 (High)

### 3.6 Media Download & Scanning Module

**FR-6.1:** Application SHALL download media file using fetch API  
**Priority:** P0 (Critical)

**FR-6.2:** Application SHALL upload media file to VirusTotal for scanning  
**Priority:** P0 (Critical)

**FR-6.3:** Application SHALL display file scan progress and results  
**Priority:** P0 (Critical)

**FR-6.4:** Application SHALL enforce file size limit (32MB - VirusTotal free tier)  
**Priority:** P0 (Critical)

**FR-6.5:** Application SHALL handle VirusTotal file upload quota limits  
**Priority:** P0 (Critical)

**FR-6.6:** Application SHALL support image formats: PNG, JPEG, GIF, WebP  
**Priority:** P0 (Critical)

### 3.7 Media Display Module

**FR-7.1:** Application SHALL display approved images in preview area  
**Priority:** P0 (Critical)

**FR-7.2:** Application SHALL display image dimensions and file size  
**Priority:** P1 (High)

**FR-7.3:** Application SHALL implement CSP headers to prevent inline script execution  
**Priority:** P0 (Critical)

**FR-7.4:** Application SHALL use img tag with sandboxing attributes  
**Priority:** P0 (Critical)

**FR-7.5:** Application SHALL handle image load errors gracefully  
**Priority:** P0 (Critical)

### 3.8 Status & Transparency Module

**FR-8.1:** Application SHALL display current step in validation pipeline  
**Priority:** P0 (Critical)

**FR-8.2:** Application SHALL show loading states for each operation  
**Priority:** P0 (Critical)

**FR-8.3:** Application SHALL display success/failure status with icons  
**Priority:** P0 (Critical)

**FR-8.4:** Application SHALL provide detailed error messages  
**Priority:** P0 (Critical)

**FR-8.5:** Application SHALL show timeline of completed steps  
**Priority:** P1 (High)

**FR-8.6:** Application SHALL display security warnings prominently  
**Priority:** P0 (Critical)

**FR-8.7:** Application SHALL log all actions to browser console for debugging  
**Priority:** P1 (High)

### 3.9 User Interface Requirements

**FR-9.1:** Application SHALL be responsive (mobile, tablet, desktop)  
**Priority:** P0 (Critical)

**FR-9.2:** Application SHALL use accessible color contrast (WCAG AA)  
**Priority:** P1 (High)

**FR-9.3:** Application SHALL provide clear call-to-action buttons  
**Priority:** P0 (Critical)

**FR-9.4:** Application SHALL include help text and tooltips  
**Priority:** P1 (High)

**FR-9.5:** Application SHALL support dark mode  
**Priority:** P2 (Medium)

**FR-9.6:** Application SHALL include "About" section explaining the tool  
**Priority:** P1 (High)

---

## 4. Non-Functional Requirements

### 4.1 Performance

**NFR-1.1:** Initial page load SHALL complete in <2 seconds  
**NFR-1.2:** URL validation SHALL complete in <500ms  
**NFR-1.3:** Metadata fetch SHALL timeout after 10 seconds  
**NFR-1.4:** Application SHALL handle files up to 32MB  
**NFR-1.5:** UI SHALL remain responsive during all operations

### 4.2 Security (OWASP Top 10 Compliance)

**NFR-2.1:** Application SHALL implement Content Security Policy (CSP)  
**Related:** A03:2021 - Injection

**NFR-2.2:** Application SHALL sanitize all user inputs and displayed data  
**Related:** A03:2021 - Injection (XSS)

**NFR-2.3:** Application SHALL use HTTPS for all external requests  
**Related:** A02:2021 - Cryptographic Failures

**NFR-2.4:** Application SHALL validate and sanitize URLs before use  
**Related:** A01:2021 - Broken Access Control

**NFR-2.5:** Application SHALL not store sensitive data in localStorage  
**Related:** A04:2021 - Insecure Design

**NFR-2.6:** Application SHALL implement Subresource Integrity (SRI) for CDN resources  
**Related:** A08:2021 - Software and Data Integrity Failures

**NFR-2.7:** Application SHALL set secure HTTP headers via GitHub Pages config  
**Related:** A05:2021 - Security Misconfiguration

**NFR-2.8:** Application SHALL handle errors without exposing sensitive information  
**Related:** A09:2021 - Security Logging and Monitoring Failures

**NFR-2.9:** Application SHALL rate limit VirusTotal API calls client-side  
**Related:** A04:2021 - Insecure Design

**NFR-2.10:** Application SHALL not execute any user-provided code  
**Related:** A03:2021 - Injection

### 4.3 Reliability

**NFR-3.1:** Application SHALL function without backend dependencies  
**NFR-3.2:** Application SHALL handle API failures gracefully  
**NFR-3.3:** Application SHALL work offline for previously loaded assets  
**NFR-3.4:** Application SHALL recover from errors without page reload

### 4.4 Usability

**NFR-4.1:** Application SHALL be usable without documentation  
**NFR-4.2:** Application SHALL provide clear feedback within 1 second of action  
**NFR-4.3:** Application SHALL use industry-standard UI patterns  
**NFR-4.4:** Application SHALL support keyboard navigation

### 4.5 Maintainability

**NFR-5.1:** Code SHALL follow ESLint recommended rules  
**NFR-5.2:** Code SHALL include JSDoc comments for all functions  
**NFR-5.3:** Code SHALL use modern ES6+ JavaScript features  
**NFR-5.4:** Code SHALL be modular with single responsibility principle  
**NFR-5.5:** Project SHALL include comprehensive README.md

### 4.6 Compatibility

**NFR-6.1:** Application SHALL work on Chrome 90+, Firefox 88+, Safari 14+, Edge 90+  
**NFR-6.2:** Application SHALL work on iOS Safari 14+ and Android Chrome 90+  
**NFR-6.3:** Application SHALL degrade gracefully on older browsers

### 4.7 Deployment

**NFR-7.1:** Application SHALL be deployable to GitHub Pages  
**NFR-7.2:** Application SHALL be accessible via HTTPS  
**NFR-7.3:** Application SHALL include robots.txt and sitemap  
**NFR-7.4:** Application SHALL have SEO-friendly metadata

---

## 5. Technical Architecture

### 5.1 Technology Stack

**Frontend Framework:** Vanilla JavaScript (ES6+)  
**Reasoning:** No build step, simple deployment, demonstrates core skills

**Styling:** CSS3 with CSS Variables  
**Reasoning:** No framework overhead, modern features, easy customization

**Optional UI Enhancement:** Tailwind CSS (via CDN)  
**Reasoning:** Rapid prototyping, responsive utilities, zero config

**Package Manager:** None (all via CDN)  
**Reasoning:** Zero setup, GitHub Pages compatible

**External APIs:**
- VirusTotal API v3 (Free tier: 4 requests/minute)
- IPFS Public Gateways (ipfs.io, cloudflare-ipfs.com)
- CORS Proxy (cors-anywhere-heroku or allorigins.win) if needed

### 5.2 File Structure

```
nft-metadata-validator/
├── index.html              # Main application page
├── css/
│   ├── main.css           # Core styles
│   ├── components.css     # UI components
│   └── responsive.css     # Media queries
├── js/
│   ├── main.js            # Application entry point
│   ├── validators/
│   │   ├── url-validator.js      # URL format validation
│   │   ├── metadata-parser.js    # JSON parsing & validation
│   │   └── security-scanner.js   # VirusTotal integration
│   ├── fetchers/
│   │   ├── metadata-fetcher.js   # Fetch metadata JSON
│   │   └── media-fetcher.js      # Fetch media files
│   ├── ui/
│   │   ├── status-display.js     # Status updates UI
│   │   ├── metadata-display.js   # Metadata rendering
│   │   └── media-display.js      # Image preview
│   └── utils/
│       ├── ipfs-utils.js         # IPFS URL conversion
│       ├── sanitizer.js          # XSS prevention
│       └── error-handler.js      # Error management
├── assets/
│   ├── icons/             # UI icons
│   └── examples/          # Example metadata files
├── docs/
│   ├── ARCHITECTURE.md    # Technical architecture
│   ├── SECURITY.md        # Security considerations
│   └── API_USAGE.md       # VirusTotal API guide
├── tests/
│   └── test.html          # Manual testing page
├── .github/
│   └── workflows/
│       └── deploy.yml     # GitHub Actions for deployment
├── README.md              # Project documentation
├── LICENSE                # MIT License
├── .gitignore
└── _config.yml            # GitHub Pages config
```

### 5.3 Application Flow

```
┌─────────────────────┐
│  User Enters URL    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│  Validate URL Format        │
│  - HTTPS/IPFS check         │
│  - Format validation        │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Scan URL (VirusTotal)      │
│  - Check URL reputation     │
│  - Display results          │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Fetch Metadata             │
│  - CORS handling            │
│  - Parse JSON               │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Validate Metadata          │
│  - Check required fields    │
│  - Detect standard          │
│  - Display parsed data      │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Extract Media URL          │
│  - Get image field          │
│  - Convert IPFS if needed   │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Scan Media URL (VT)        │
│  - Check URL reputation     │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Download Media File        │
│  - Fetch with size limit    │
│  - Check file type          │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Scan File (VirusTotal)     │
│  - Upload to VT             │
│  - Get scan results         │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  Display Media              │
│  - Render image preview     │
│  - Show metadata            │
└─────────────────────────────┘
```

### 5.4 Security Measures

#### 5.4.1 Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' https://cdn.jsdelivr.net; 
               style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; 
               img-src 'self' data: https: ipfs.io cloudflare-ipfs.com; 
               connect-src 'self' https://www.virustotal.com https://ipfs.io https://cloudflare-ipfs.com; 
               font-src 'self' https://cdn.jsdelivr.net; 
               object-src 'none'; 
               base-uri 'self'; 
               form-action 'self';">
```

#### 5.4.2 XSS Prevention

```javascript
// Sanitize all user input and API responses
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Use textContent instead of innerHTML
element.textContent = userInput;

// For rich content, use DOMPurify library
const clean = DOMPurify.sanitize(dirty);
```

#### 5.4.3 URL Validation

```javascript
function isValidURL(url) {
    try {
        const urlObj = new URL(url);
        
        // Only allow HTTPS and IPFS
        if (!['https:', 'ipfs:'].includes(urlObj.protocol)) {
            return { valid: false, reason: 'Only HTTPS and IPFS protocols allowed' };
        }
        
        // Prevent data URLs, javascript:, etc.
        const dangerous = ['data:', 'javascript:', 'file:', 'about:'];
        if (dangerous.some(d => url.toLowerCase().startsWith(d))) {
            return { valid: false, reason: 'Dangerous protocol detected' };
        }
        
        // Basic length check
        if (url.length > 2048) {
            return { valid: false, reason: 'URL too long' };
        }
        
        return { valid: true };
    } catch (e) {
        return { valid: false, reason: 'Invalid URL format' };
    }
}
```

#### 5.4.4 IPFS URL Handling

```javascript
function convertIPFStoHTTP(ipfsUrl) {
    // ipfs://QmHash -> https://ipfs.io/ipfs/QmHash
    if (ipfsUrl.startsWith('ipfs://')) {
        const hash = ipfsUrl.replace('ipfs://', '');
        return `https://ipfs.io/ipfs/${hash}`;
    }
    
    // Already HTTP gateway
    if (ipfsUrl.includes('ipfs.io') || ipfsUrl.includes('cloudflare-ipfs.com')) {
        return ipfsUrl;
    }
    
    throw new Error('Invalid IPFS URL format');
}
```

### 5.5 VirusTotal API Integration

#### 5.5.1 API Configuration

```javascript
const VT_CONFIG = {
    API_KEY: '', // Optional - works without for public endpoints
    BASE_URL: 'https://www.virustotal.com/api/v3',
    RATE_LIMIT: {
        requests: 4,
        window: 60000 // 1 minute
    },
    FILE_SIZE_LIMIT: 32 * 1024 * 1024 // 32MB
};
```

#### 5.5.2 Rate Limiting

```javascript
class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }
    
    async waitForSlot() {
        const now = Date.now();
        this.requests = this.requests.filter(t => now - t < this.windowMs);
        
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const waitTime = this.windowMs - (now - oldestRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.waitForSlot();
        }
        
        this.requests.push(now);
    }
}
```

#### 5.5.3 URL Scanning

```javascript
async function scanURL(url, apiKey = '') {
    const rateLimiter = new RateLimiter(4, 60000);
    await rateLimiter.waitForSlot();
    
    const urlId = btoa(url).replace(/=/g, '');
    const endpoint = `${VT_CONFIG.BASE_URL}/urls/${urlId}`;
    
    const headers = {};
    if (apiKey) {
        headers['x-apikey'] = apiKey;
    }
    
    try {
        const response = await fetch(endpoint, { headers });
        
        if (response.status === 404) {
            // URL not in VT database, submit for scanning
            return await submitURLForScanning(url, apiKey);
        }
        
        const data = await response.json();
        return {
            scanned: true,
            stats: data.data.attributes.last_analysis_stats,
            detections: data.data.attributes.last_analysis_results
        };
    } catch (error) {
        return {
            scanned: false,
            error: error.message
        };
    }
}
```

#### 5.5.4 File Scanning

```javascript
async function scanFile(file, apiKey = '') {
    if (file.size > VT_CONFIG.FILE_SIZE_LIMIT) {
        throw new Error(`File too large. Max size: 32MB`);
    }
    
    const rateLimiter = new RateLimiter(4, 60000);
    await rateLimiter.waitForSlot();
    
    const formData = new FormData();
    formData.append('file', file);
    
    const headers = {};
    if (apiKey) {
        headers['x-apikey'] = apiKey;
    }
    
    const response = await fetch(`${VT_CONFIG.BASE_URL}/files`, {
        method: 'POST',
        headers,
        body: formData
    });
    
    const data = await response.json();
    const analysisId = data.data.id;
    
    // Poll for results
    return await pollAnalysisResults(analysisId, apiKey);
}
```

### 5.6 CORS Handling

```javascript
// Option 1: Try direct fetch first (works if CORS enabled)
async function fetchWithCORS(url) {
    try {
        const response = await fetch(url, {
            mode: 'cors',
            headers: {
                'Accept': 'application/json'
            }
        });
        return response;
    } catch (error) {
        // Option 2: Use CORS proxy
        return fetchViaCORSProxy(url);
    }
}

// Option 3: Use public CORS proxy
async function fetchViaCORSProxy(url) {
    const proxyURL = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyURL);
    const data = await response.json();
    return {
        ok: true,
        json: async () => JSON.parse(data.contents)
    };
}
```

---

## 6. UI/UX Design

### 6.1 Layout Structure

```
┌─────────────────────────────────────────────┐
│              Header                         │
│  NFT Metadata Validator & Security Scanner │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│              Input Section                  │
│  ┌───────────────────────────────────────┐ │
│  │ Enter NFT Metadata URL:               │ │
│  │ [____________________________]  [Scan]│ │
│  └───────────────────────────────────────┘ │
│  Examples: Enjin | OpenSea | Generic       │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│          Validation Pipeline                │
│  ✓ URL Format Validation                   │
│  ⏳ Security Scan (VirusTotal)              │
│  ⏺ Metadata Fetch                          │
│  ⏺ Metadata Parsing                        │
│  ⏺ Media URL Security Scan                 │
│  ⏺ Media Download                          │
│  ⏺ File Security Scan                      │
│  ⏺ Media Display                           │
└─────────────────────────────────────────────┘
┌──────────────────┬──────────────────────────┐
│  Metadata View   │   Media Preview          │
│  ┌────────────┐  │   ┌────────────────────┐ │
│  │ Name:      │  │   │                    │ │
│  │ Desc:      │  │   │   [Image Preview]  │ │
│  │ Properties │  │   │                    │ │
│  │            │  │   └────────────────────┘ │
│  │ Raw JSON ▼ │  │   Dimensions: 1024x1024│ │
│  └────────────┘  │   Size: 2.3 MB         │ │
└──────────────────┴──────────────────────────┘
┌─────────────────────────────────────────────┐
│              Footer                         │
│  GitHub | Documentation | Security Info    │
└─────────────────────────────────────────────┘
```

### 6.2 Status Indicators

```css
/* Status colors */
.status-pending { color: #FFA500; } /* Orange */
.status-loading { color: #4A90E2; } /* Blue */
.status-success { color: #27AE60; } /* Green */
.status-warning { color: #F39C12; } /* Yellow */
.status-error { color: #E74C3C; }   /* Red */

/* Icons */
.icon-pending::before { content: '⏺'; }
.icon-loading::before { content: '⏳'; }
.icon-success::before { content: '✓'; }
.icon-warning::before { content: '⚠'; }
.icon-error::before { content: '✗'; }
```

### 6.3 Responsive Breakpoints

```css
/* Mobile: 320px - 767px */
@media (max-width: 767px) {
    .container { padding: 1rem; }
    .split-view { flex-direction: column; }
}

/* Tablet: 768px - 1023px */
@media (min-width: 768px) and (max-width: 1023px) {
    .container { padding: 2rem; }
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
    .container { max-width: 1200px; margin: 0 auto; }
}
```

---

## 7. Testing Strategy

### 7.1 Unit Testing (Manual)

**Test Cases:**
1. URL validation with valid HTTPS URLs
2. URL validation with valid IPFS URLs
3. URL validation with invalid protocols
4. IPFS URL conversion to HTTP gateway
5. JSON parsing with valid metadata
6. JSON parsing with invalid JSON
7. Metadata validation for Enjin standard
8. XSS sanitization tests
9. Rate limiter functionality
10. Error handling for network failures

### 7.2 Integration Testing

**Test Scenarios:**
1. Complete flow: HTTPS URL → metadata → image display
2. Complete flow: IPFS URL → metadata → image display
3. VirusTotal API integration (with/without API key)
4. CORS proxy fallback
5. Large file handling (>32MB rejection)
6. Network timeout handling
7. Invalid metadata structure
8. Missing image field in metadata
9. Malicious URL handling
10. Rate limit exceeded scenario

### 7.3 Security Testing

**OWASP Top 10 Test Cases:**

1. **A01:2021 - Broken Access Control**
   - Test: Attempt to access file:// URLs
   - Expected: Rejection with error message

2. **A02:2021 - Cryptographic Failures**
   - Test: Try HTTP URL instead of HTTPS
   - Expected: Warning or rejection

3. **A03:2021 - Injection (XSS)**
   - Test: Input `<script>alert('xss')</script>` in metadata
   - Expected: Sanitized display, no script execution

4. **A04:2021 - Insecure Design**
   - Test: Rapid-fire API requests
   - Expected: Rate limiting kicks in

5. **A05:2021 - Security Misconfiguration**
   - Test: Check CSP headers in browser dev tools
   - Expected: Strict CSP policy enforced

6. **A06:2021 - Vulnerable Components**
   - Test: Verify all CDN resources use SRI
   - Expected: Integrity hashes present

7. **A07:2021 - Identification & Authentication**
   - N/A: No authentication in static app

8. **A08:2021 - Software & Data Integrity**
   - Test: Verify VirusTotal responses not blindly trusted
   - Expected: User can review results before proceeding

9. **A09:2021 - Logging & Monitoring**
   - Test: Check console logs during operation
   - Expected: All actions logged with timestamps

10. **A10:2021 - SSRF**
    - Test: Input localhost URLs
    - Expected: Client-side validation prevents fetch

### 7.4 User Acceptance Testing

**Scenarios:**
1. First-time user can validate NFT metadata without documentation
2. User understands why validation failed
3. User can see security scan results clearly
4. User can view metadata before seeing media
5. Mobile user can complete full flow
6. User on slow connection receives feedback

### 7.5 Test Data

**Valid Test URLs:**
```
HTTPS Enjin Example:
https://raw.githubusercontent.com/[user]/nft-examples/main/enjin-metadata.json

IPFS Example:
ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG
https://ipfs.io/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG

Generic OpenSea:
https://raw.githubusercontent.com/[user]/nft-examples/main/opensea-metadata.json
```

**Invalid Test URLs:**
```
file:///etc/passwd
javascript:alert(1)
data:text/html,<script>alert('XSS')</script>
http://example.com/metadata.json (HTTP not HTTPS)
```

**Malicious Test Cases:**
```
XSS in metadata:
{"name": "<script>alert('xss')</script>"}

Malformed JSON:
{name: "test" (missing quotes and closing brace)

Missing required fields:
{"name": "Test"} (no image field)
```

---

## 8. Deployment Strategy

### 8.1 GitHub Pages Setup

**Steps:**
1. Create repository: `nft-metadata-scanner`
2. Enable GitHub Pages in Settings → Pages
3. Select branch: `main`, folder: `/ (root)`
4. Add custom domain (optional): `validator.yourdomain.com`
5. Configure HTTPS enforcement

**GitHub Actions Workflow:**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Validate HTML
        run: |
          npm install -g html-validate
          html-validate index.html
      
      - name: Validate CSS
        run: |
          npm install -g stylelint
          stylelint "css/**/*.css"
      
      - name: Lint JavaScript
        run: |
          npm install -g eslint
          eslint "js/**/*.js"
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        if: github.ref == 'refs/heads/main'
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

### 8.2 Configuration Files

**_config.yml (GitHub Pages):**
```yaml
title: NFT Metadata Validator
description: Secure validation and preview tool for NFT metadata
google_analytics: UA-XXXXXXXXX-X (optional)
```

**robots.txt:**
```
User-agent: *
Allow: /

Sitemap: https://yourusername.github.io/nft-metadata-scanner/sitemap.xml
```

**sitemap.xml:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
   <url>
      <loc>https://yourusername.github.io/nft-metadata-scanner/</loc>
      <lastmod>2026-02-12</lastmod>
      <changefreq>monthly</changefreq>
      <priority>1.0</priority>
   </url>
</urlset>
```

### 8.3 SEO Optimization

**index.html <head> section:**
```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- SEO -->
    <title>NFT Metadata Validator - Secure Preview & Validation Tool</title>
    <meta name="description" content="Validate and preview NFT metadata securely. Supports Enjin Blockchain, IPFS, and standard NFT formats with integrated security scanning.">
    <meta name="keywords" content="NFT, metadata, validator, Enjin, IPFS, security, blockchain">
    <meta name="author" content="Your Name">
    
    <!-- Open Graph -->
    <meta property="og:title" content="NFT Metadata Validator">
    <meta property="og:description" content="Secure NFT metadata validation and preview tool">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://yourusername.github.io/nft-metadata-scanner/">
    <meta property="og:image" content="https://yourusername.github.io/nft-metadata-scanner/assets/og-image.png">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="NFT Metadata Validator">
    <meta name="twitter:description" content="Secure NFT metadata validation and preview tool">
    <meta name="twitter:image" content="https://yourusername.github.io/nft-metadata-scanner/assets/twitter-card.png">
    
    <!-- Security Headers -->
    <meta http-equiv="Content-Security-Policy" content="...">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin">
</head>
```

---

## 9. Documentation Requirements

### 9.1 README.md Structure

```markdown
# NFT Metadata Validator

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![GitHub Pages](https://img.shields.io/badge/demo-live-green.svg)

🔐 Secure validation and preview tool for NFT metadata

## 🎯 Features
- ✅ HTTPS and IPFS URL support
- 🔒 VirusTotal security scanning
- 📋 Enjin Blockchain metadata standard support
- 🖼️ Safe media preview
- 📱 Responsive design
- 🚫 Zero backend requirements

## 🚀 Live Demo
[https://yourusername.github.io/nft-metadata-scanner/](...)

## 📖 Usage
1. Enter NFT metadata URL
2. Review security scan results
3. Preview metadata and media

## 🛡️ Security
- OWASP Top 10 compliant
- Content Security Policy enforced
- XSS protection
- VirusTotal integration

## 🔧 Local Development
```bash
git clone https://github.com/yourusername/nft-metadata-scanner.git
cd nft-metadata-scanner
# Open index.html in browser or use:
python -m http.server 8000
```

## 🧪 Testing
Open `tests/test.html` in browser for manual tests

## 📚 Documentation
- [Architecture](docs/ARCHITECTURE.md)
- [Security](docs/SECURITY.md)
- [API Usage](docs/API_USAGE.md)

## 🤝 Contributing
Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 License
MIT License - see [LICENSE](LICENSE)

## 👤 Author
**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [yourprofile](https://linkedin.com/in/yourprofile)
```

### 9.2 SECURITY.md

```markdown
# Security Policy

## Supported Versions
| Version | Supported |
| ------- | --------- |
| 1.0.x   | ✅        |

## Security Features
- Content Security Policy (CSP)
- XSS sanitization
- VirusTotal integration
- HTTPS enforcement
- CORS handling
- Rate limiting

## Reporting Vulnerabilities
Report security issues via GitHub Security Advisories

## Security Measures
See [docs/SECURITY.md](docs/SECURITY.md) for details
```

---

## 10. Success Metrics

### 10.1 Technical Metrics
- **Code Quality:** ESLint 0 errors, 0 warnings
- **Performance:** Lighthouse score >90
- **Security:** CSP fully enforced, XSS tests passed
- **Accessibility:** WCAG AA compliance
- **Browser Support:** Chrome/Firefox/Safari/Edge latest versions

### 10.2 User Metrics
- **Task Completion:** >90% users can validate metadata
- **Error Rate:** <5% failed validations due to tool bugs
- **Load Time:** <2s initial page load
- **Mobile Usage:** Works on iOS/Android

### 10.3 Portfolio Metrics
- **GitHub Stars:** Target 50+ in 6 months
- **Code Quality:** Demonstrates best practices
- **Documentation:** Complete and professional
- **Security:** OWASP Top 10 coverage documented

---

## 11. Future Enhancements (Post-MVP)

### Phase 2: Enhanced Features
- Video file support
- 3D model preview (GLB/GLTF)
- Multiple IPFS gateway fallbacks
- Metadata validation history
- Export validation reports

### Phase 3: Advanced Security
- Custom security rules
- Blockchain verification
- Duplicate detection
- Reputation scoring

### Phase 4: Ecosystem Integration
- Browser extension
- API for developers
- Enjin Platform SDK integration
- Multi-chain support

---

## Appendix A: VirusTotal API Reference

### Free Tier Limits
- **Requests:** 4 per minute
- **Daily Quota:** 500 requests
- **File Size:** 32MB max
- **Rate:** 1 request every 15 seconds recommended

### API Endpoints

**Get URL Report:**
```
GET https://www.virustotal.com/api/v3/urls/{url_id}
Header: x-apikey: YOUR_API_KEY (optional for public data)
```

**Submit URL for Scanning:**
```
POST https://www.virustotal.com/api/v3/urls
Body: url={url}
```

**Upload File:**
```
POST https://www.virustotal.com/api/v3/files
Body: multipart/form-data with file
```

**Get Analysis:**
```
GET https://www.virustotal.com/api/v3/analyses/{id}
```

### Response Format
```json
{
  "data": {
    "attributes": {
      "last_analysis_stats": {
        "harmless": 70,
        "malicious": 2,
        "suspicious": 0,
        "undetected": 10
      },
      "last_analysis_results": {
        "Engine1": {
          "category": "harmless",
          "result": "clean"
        }
      }
    }
  }
}
```

---

## Appendix B: Enjin Metadata Standard

### Required Fields
```json
{
  "name": "string",
  "description": "string",
  "image": "string (URL)"
}
```

### Optional Fields
```json
{
  "decimals": 0,
  "properties": {
    "key": "value"
  },
  "localization": {
    "uri": "ipfs://...",
    "default": "en",
    "locales": ["en", "es", "fr"]
  }
}
```

### Example
```json
{
  "name": "Legendary Sword",
  "description": "A powerful blade forged in dragon fire",
  "image": "ipfs://QmHash",
  "decimals": 0,
  "properties": {
    "attack": "150",
    "durability": "1000",
    "rarity": "legendary"
  }
}
```

---

## Appendix C: Error Codes

| Code | Message | Description |
|------|---------|-------------|
| E1001 | Invalid URL scheme | Non-HTTPS protocol |
| E1002 | SSRF detected | Private IP or localhost |
| E1003 | URL too long | Exceeds 2048 characters |
| E1004 | Domain blocked | In blocklist |
| E2001 | Download timeout | Exceeded 10 seconds |
| E2002 | File too large | Exceeds size limit |
| E2003 | Invalid content-type | Mismatch with URL |
| E3001 | Invalid file format | Magic bytes mismatch |
| E3002 | Unsupported format | Not in whitelist |
| E3003 | Corrupted file | Parse error |
| E3004 | Decompression bomb | Excessive expansion |
| E4001 | Malware detected | VirusTotal positive |
| E4002 | Suspicious content | Multiple security flags |
| E5001 | NSFW content | Above threshold |
| E5002 | Blocked hash | Known bad content |
| E6001 | Rate limit exceeded | Too many requests |

---

**END OF DOCUMENT**
