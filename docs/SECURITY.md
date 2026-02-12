# Security Policy

> **Note:** This document was created as part of the project planning phase and serves as a template/reference for future projects. The current implementation may not fully align with all details described herein.

## Overview

The NFT Metadata Scanner prioritizes security in all aspects of its design and implementation. As a client-side web application that handles user-provided URLs and displays external content, we implement comprehensive security measures to protect users from malicious content and prevent security vulnerabilities.

## Security Principles

- **Zero Trust**: All inputs are validated and sanitized
- **Defense in Depth**: Multiple security layers protect against threats
- **Fail-Safe Defaults**: Secure behavior is the default state
- **Transparency**: Security decisions are documented and auditable

## OWASP Top 10 Compliance

### A01:2021 - Broken Access Control
**Mitigation:**
- URL validation restricts protocols to HTTPS and IPFS only
- SSRF prevention blocks localhost, private IPs, and cloud metadata endpoints
- Input validation prevents directory traversal and path manipulation

**Implementation:**
```javascript
// Only allow safe protocols
if (!['https:', 'ipfs:'].includes(url.protocol)) {
    return { valid: false, reason: 'Only HTTPS/IPFS allowed' };
}
```

### A02:2021 - Cryptographic Failures
**Mitigation:**
- HTTPS enforced for all external requests
- No sensitive data stored in localStorage or sessionStorage
- API keys kept in memory only during active sessions

**Implementation:**
- All external URLs must use HTTPS
- Sensitive data never persisted to disk
- Secure defaults prevent accidental data exposure

### A03:2021 - Injection (XSS Prevention)
**Mitigation:**
- Strict Content Security Policy (CSP) in HTML meta tags
- All user inputs sanitized before display
- DOM manipulation uses `textContent` instead of `innerHTML`

**CSP Configuration:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  connect-src 'self' https://www.virustotal.com https://www.allorigins.win;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

**XSS Prevention:**
```javascript
// Safe text rendering
element.textContent = userInput;

// Sanitized HTML when needed
element.innerHTML = sanitizeText(userInput);
```

### A04:2021 - Insecure Design
**Mitigation:**
- Client-side rate limiting for API calls
- Input validation with comprehensive error messages
- Secure defaults with explicit allowlists

**Rate Limiting:**
```javascript
class RateLimiter {
    constructor(maxRequests = 4, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    async waitForSlot() {
        // Implementation prevents API abuse
    }
}
```

### A05:2021 - Security Misconfiguration
**Mitigation:**
- Strict CSP headers prevent script injection
- Subresource Integrity (SRI) for CDN resources
- Secure coding practices enforced

**Configuration:**
- No inline scripts or styles allowed
- External resources validated with SRI hashes
- Error messages don't expose system details

### A06:2021 - Vulnerable and Outdated Components
**Mitigation:**
- Minimal dependency footprint
- Regular security audits of third-party services
- No client-side package management

**Dependencies:**
- Vanilla JavaScript (no frameworks)
- Trusted CDN sources only
- Manual review of all external services

### A08:2021 - Software and Data Integrity Failures
**Mitigation:**
- Response validation for all API calls
- Content-type verification for downloads
- Size limits prevent resource exhaustion

**Validation:**
```javascript
// Verify response content
const contentType = response.headers.get('content-type');
if (!contentType.includes('application/json')) {
    throw new Error('Invalid response type');
}
```

### A09:2021 - Security Logging and Monitoring Failures
**Mitigation:**
- Structured security event logging
- No sensitive data in log messages
- Console logging for development debugging

**Logging Format:**
```javascript
console.error('[NFT-Scanner]', {
    timestamp: new Date().toISOString(),
    type: 'SecurityError',
    message: 'Blocked dangerous URL scheme',
    context: { url: blockedUrl },
    stack: error.stack
});
```

### A10:2021 - Server-Side Request Forgery (SSRF)
**Mitigation:**
- Comprehensive URL validation
- IP address blacklisting
- Protocol restrictions

**Blocked Patterns:**
- `localhost`, `127.0.0.1`, `::1`
- Private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- Cloud metadata endpoints (169.254.169.254, etc.)
- Non-HTTP/HTTPS protocols

## Security Features

### URL Validation
- **Protocol Enforcement**: HTTPS and IPFS only
- **SSRF Prevention**: Blocks internal network access
- **Length Limits**: Maximum 2048 characters
- **Format Validation**: Proper URL structure required

### Content Security
- **CSP Headers**: Prevent script injection attacks
- **XSS Sanitization**: All displayed content sanitized
- **Media Safety**: Blob URLs prevent direct script execution
- **Size Limits**: Prevent resource exhaustion attacks

### API Security
- **Rate Limiting**: 4 requests per minute for VirusTotal
- **Key Protection**: API keys never stored persistently
- **Response Validation**: All API responses verified
- **Error Handling**: Secure error messages

### Network Security
- **HTTPS Only**: All external connections encrypted
- **Timeout Controls**: Prevent hanging connections
- **CORS Handling**: Trusted proxy fallback
- **Request Limits**: Prevent abuse

## Threat Model

### Attack Vectors Considered

1. **Malicious URLs**
   - Dangerous protocols (javascript:, data:, file:)
   - SSRF attempts to internal services
   - Extremely long URLs causing buffer issues

2. **Malicious Metadata**
   - XSS payloads in NFT descriptions
   - Malicious image URLs
   - Invalid JSON structures

3. **API Abuse**
   - Rate limit bypass attempts
   - API key theft
   - Malformed requests

4. **Browser Exploitation**
   - CSP bypass attempts
   - DOM-based XSS
   - Memory exhaustion

### Mitigation Strategies

- **Input Validation**: All inputs validated before processing
- **Output Encoding**: All outputs properly encoded
- **Error Handling**: Secure error responses
- **Resource Limits**: Prevent DoS conditions
- **Monitoring**: Security events logged and monitored

## Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability in the NFT Metadata Scanner, please help us by reporting it responsibly.

### Reporting Process

1. **Do Not** create public GitHub issues for security vulnerabilities
2. **Email** security concerns to: [security contact email - TBD]
3. **Include** detailed information about the vulnerability
4. **Allow** reasonable time for response and fixes

### What to Include

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Suggested mitigation approaches
- Your contact information for follow-up

### Our Commitment

- **Response Time**: Acknowledge reports within 48 hours
- **Investigation**: Thorough analysis of reported issues
- **Fix Timeline**: Work towards timely resolution
- **Credit**: Acknowledge security researchers (with permission)
- **No Retaliation**: Good faith reports protected

## Security Updates

### Version Security
- Security fixes released as patch versions
- Critical vulnerabilities addressed immediately
- Backwards compatibility maintained when possible

### Communication
- Security advisories posted to GitHub Security tab
- Breaking changes documented in release notes
- Migration guides provided for security updates

## Development Security

### Code Review Requirements
- Security review checklist for all changes
- OWASP Top 10 consideration in PR reviews
- Automated security scanning where possible

### Testing Security
- Manual security testing for new features
- Cross-browser security validation
- Input fuzzing and edge case testing

## Third-Party Services

### VirusTotal API
- **Rate Limiting**: Respects API quotas
- **Data Handling**: No user data sent to VirusTotal
- **Privacy**: URL scanning only (no file uploads by default)

### CORS Proxy (allorigins.win, corsproxy.org)
- **Fallback Only**: Used when direct requests fail
- **Multiple Providers**: Automatic fallback between proxy services
- **Trust Model**: Limited to JSON metadata requests
- **Monitoring**: Request failures logged for analysis
- **Timeout Handling**: 15-second timeout with user-friendly error messages

## Compliance

### Standards Compliance
- **OWASP Top 10**: Comprehensive coverage
- **WCAG 2.1 AA**: Accessibility security considerations
- **CSP Level 3**: Modern security headers

### Legal Compliance
- **Data Protection**: No user data collection
- **Privacy**: Client-side only processing
- **Open Source**: Transparent security practices

## Contact Information

- **Security Issues**: [security contact - TBD]
- **General Support**: GitHub Issues
- **Documentation**: This SECURITY.md file

## Version History

- **v1.0.0**: Initial security policy implementation
- OWASP Top 10 2021 compliance
- CSP and XSS prevention measures
- SSRF protection and rate limiting

---

*This security policy is reviewed and updated regularly to address new threats and maintain compliance with security best practices.*