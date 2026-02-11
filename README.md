# NFT Metadata Scanner

> **⚠️ This project is under active development.** It is a personal portfolio project being built with the help of AI coding assistants. Features may be incomplete, and breaking changes are expected.

🛡️ A secure, client-side web application for validating and previewing NFT metadata. Supports **Enjin Blockchain**, **ERC-721**, and **ERC-1155** metadata standards with integrated **VirusTotal** security scanning.

## Features

- ✅ **URL Validation** — HTTPS and IPFS (`ipfs://`) URL support with SSRF protection
- 🔒 **Security Scanning** — VirusTotal API integration for URL and file scanning
- 📋 **Metadata Parsing** — Auto-detects Enjin, ERC-721, and ERC-1155 standards
- 🖼️ **Safe Media Preview** — Image rendering with Content Security Policy protection
- 📱 **Responsive Design** — Mobile-first layout for phones, tablets, and desktops
- 🚫 **Zero Backend** — Everything runs client-side; your data never leaves your browser
- ♿ **Accessible** — Keyboard navigable, screen-reader friendly, WCAG 2.1 AA target

## Live Demo

Coming soon — will be deployed to GitHub Pages.

## Quick Start

No build tools or dependencies required. Just serve the files:

```bash
# Clone the repository
git clone https://github.com/bladzv/nft-metadata-scanner.git
cd nft-metadata-scanner

# Serve with any static server
python3 -m http.server 8000
# or
npx serve .
```

Open `http://localhost:8000` in your browser.

## Usage

1. Enter an NFT metadata URL (HTTPS or IPFS format)
2. Optionally provide a VirusTotal API key for security scanning
3. Click **Scan** to run the validation pipeline
4. Review metadata details and media preview

## Project Structure

```
nft-metadata-scanner/
├── index.html                 # Main application page
├── css/
│   ├── main.css               # Core styles & CSS variables
│   ├── components.css         # Reusable UI components
│   └── responsive.css         # Responsive breakpoints
├── js/
│   ├── main.js                # Application entry point & pipeline orchestration
│   ├── validators/
│   │   ├── url-validator.js       # URL format & security validation
│   │   ├── metadata-parser.js     # JSON parsing & standard detection
│   │   └── security-scanner.js    # VirusTotal API integration
│   ├── fetchers/
│   │   ├── metadata-fetcher.js    # Metadata JSON fetching with CORS fallback
│   │   └── media-fetcher.js       # Image fetching & validation
│   └── ui/
│       ├── status-display.js      # Validation pipeline UI
│       ├── metadata-display.js    # Metadata rendering
│       └── media-display.js       # Image preview rendering
│   └── utils/
│       ├── ipfs-utils.js          # IPFS URL conversion & CID validation
│       ├── sanitizer.js           # XSS prevention utilities
│       └── error-handler.js       # Centralized error handling & logging
├── docs/
│   ├── PRD-NFT-Metadata-Scanner.md    # Product requirements
│   └── PROJECT-MANAGEMENT-PLAN.md     # Project management plan
├── .github/
│   └── copilot-instructions.md        # AI coding agent guidelines
├── ai-instructions.md                 # Detailed AI assistant instructions
├── LICENSE
└── README.md
```

## Security

This application is built with **OWASP Top 10** compliance in mind:

| Category | Implementation |
|----------|---------------|
| **A01: Broken Access Control** | URL validation blocks `file://`, `javascript:`, `data:` schemes; SSRF prevention blocks private IPs |
| **A03: Injection (XSS)** | All user/API text rendered via `textContent`; strict CSP in HTML meta tags |
| **A04: Insecure Design** | Client-side rate limiting for VirusTotal API (4 req/min) |
| **A05: Security Misconfig** | CSP headers, no inline scripts, no `eval()` |
| **A08: Data Integrity** | Subresource Integrity planned for any future CDN resources |
| **A10: SSRF** | Blocks localhost, private IPs, cloud metadata endpoints |

**Privacy:** No data is sent to any backend. The only external API calls are to VirusTotal (user-initiated) and IPFS gateways (for content retrieval).

## Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+ modules), HTML5, CSS3
- **APIs:** VirusTotal API v3, IPFS public gateways
- **Deployment:** GitHub Pages (planned)
- **Build Tools:** None — zero dependencies, no build step

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome for Android 90+

## Development Status

This is a **personal portfolio project** under active development, built collaboratively with AI coding assistants. The current version includes:

- [x] Project architecture and file structure
- [x] URL validation with SSRF protection
- [x] IPFS URL detection and gateway conversion
- [x] Metadata fetching with CORS proxy fallback
- [x] Metadata parsing (Enjin, ERC-721, ERC-1155)
- [x] VirusTotal API integration (URL scanning)
- [x] Safe media preview with blob URLs
- [x] Responsive mobile-first UI
- [x] Accessible pipeline status display
- [ ] VirusTotal file upload scanning
- [ ] Result caching (sessionStorage)
- [ ] Dark/light theme toggle
- [ ] Comprehensive test suite
- [ ] GitHub Pages deployment
- [ ] GitHub Actions CI/CD pipeline

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

## Author

**bladzv** — [GitHub](https://github.com/bladzv)

---

*Built with ❤️ and AI assistance as a cybersecurity portfolio project.*
