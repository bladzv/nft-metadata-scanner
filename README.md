# NFT Metadata Scanner

> **Secure, Client-Side NFT Metadata Validation Tool with Advanced Security Features**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue)](https://bladzv.github.io/nft-metadata-scanner/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![OWASP Compliant](https://img.shields.io/badge/OWASP-Top%2010%20Compliant-green)](https://owasp.org/)

A client-side web application for secure validation and preview of NFT metadata. Supports Enjin Blockchain, ERC-721, and ERC-1155 standards with integrated VirusTotal security scanning. Built with security best practices and OWASP Top 10 compliance.

## Table of Contents

- [Features](#features)
- [Live Demo](#live-demo)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Security](#security)
- [Tech Stack](#tech-stack)
- [Development Status](#development-status)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)

## Features

### 🔒 Advanced Security & Compliance
- **OWASP Top 10 Compliant**: Implements comprehensive security measures against injection, broken access control, and SSRF attacks
- **VirusTotal Integration**: Real-time URL and file scanning with rate limiting and quota management
- **Content Security Policy**: Strict CSP headers prevent XSS and script injection attacks
- **SSRF Protection**: Blocks private IPs, localhost, and cloud metadata endpoints

### 🌐 Multi-Protocol Support
- **IPFS Native**: Direct `ipfs://` protocol support with automatic gateway fallback
- **HTTPS Validation**: Secure URL validation with certificate verification
- **Gateway Redundancy**: Multiple IPFS gateways ensure high availability

### 📊 NFT Standards Support
- **Enjin Blockchain**: Full support for gaming and multiverse NFT metadata
- **ERC-721**: Standard NFT metadata parsing and validation
- **ERC-1155**: Multi-token standard support with attribute validation
- **Auto-Detection**: Intelligent standard detection from metadata structure

### 🎨 User Experience
- **Responsive Design**: Mobile-first layout optimized for all devices
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation and screen reader support
- **Real-time Feedback**: Live pipeline status with detailed error reporting
- **Safe Media Preview**: Blob-based image rendering with size and type validation

### 🛠️ Developer Features
- **Zero Dependencies**: Pure vanilla JavaScript with no build tools required
- **Modular Architecture**: ES6 modules for maintainable, scalable code
- **Comprehensive Logging**: Structured error handling and security event logging
- **Client-Side Processing**: No backend required, ensuring privacy and performance

## Live Demo

This project is hosted on GitHub Pages and can be accessed at: https://bladzv.github.io/nft-metadata-scanner/

## Why This Project?

The NFT Metadata Scanner addresses critical needs in the blockchain and NFT ecosystem:

- **Security First**: In an era of rising NFT scams and malicious metadata, this tool provides reliable validation
- **Decentralized Compatibility**: Native IPFS support ensures compatibility with decentralized storage solutions
- **Developer Friendly**: Open-source, well-documented, and easy to integrate or extend
- **Privacy Focused**: Client-side processing means your NFT data never leaves your device
- **Standards Compliant**: Supports major NFT standards ensuring broad compatibility

Perfect for NFT developers, collectors, marketplaces, and security researchers who need reliable metadata validation tools.

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
├── favicon/
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   ├── apple-touch-icon.png
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── favicon.ico
│   └── site.webmanifest
├── index.html                        # Main application page
├── css/
│   ├── components.css               # Reusable UI components
│   ├── main.css                     # Core styles & CSS variables
│   └── responsive.css               # Responsive breakpoints
├── js/
│   ├── main.js                      # Application entry point & pipeline orchestration
│   ├── fetchers/
│   │   ├── metadata-fetcher.js      # Metadata JSON fetching with CORS & gateway fallback
│   │   └── media-fetcher.js         # Image fetching & validation
│   ├── validators/
│   │   ├── metadata-parser.js       # JSON parsing & standard detection
│   │   ├── security-scanner.js      # VirusTotal API integration
│   │   └── url-validator.js         # URL format & security validation
│   ├── ui/
│   │   ├── metadata-display.js      # Metadata rendering
│   │   ├── media-display.js         # Image preview rendering
│   │   └── status-display.js        # Validation pipeline UI
│   └── utils/
│       ├── error-handler.js         # Centralized error handling & logging
│       ├── ipfs-utils.js            # IPFS URL conversion & CID validation
│       └── sanitizer.js             # XSS prevention utilities
├── docs/
│   ├── ARCHITECTURE.md              # Architecture guide (template/reference)
│   ├── NFT-METADATA-STANDARDS.md    # Standards reference and examples
│   ├── PRD-NFT-Metadata-Scanner.md  # Product requirements (active)
│   ├── PROJECT-MANAGEMENT-PLAN.md   # Project management plan (template/reference)
│   └── SECURITY.md                  # Security policy (template/reference)
├── .github/
│   ├── copilot-instructions.md      # AI coding agent guidelines
│   └── ai-instructions.md               # Detailed AI assistant instructions
├── LICENSE
└── README.md
```

## Documentation

This repository includes several planning and reference documents under the `docs/` directory. Note that some of these documents are intentionally written as templates or references for future projects and planning work; they are not required for the current running application.

- `docs/ARCHITECTURE.md` — High-level architecture guide (template/reference for future projects).
- `docs/PROJECT-MANAGEMENT-PLAN.md` — Project planning and sprint breakdown (template/reference for future projects).
- `docs/SECURITY.md` — Security policy and OWASP checklist (planning reference; implementation is applied in code where relevant).
- `docs/PRD-NFT-Metadata-Scanner.md` — Product requirements for this MVP (active document).

If you're reviewing the repo for deployment or contribution, focus first on the `index.html`, `js/`, and `css/` files; the `docs/` folder is primarily informational.


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

## Development Status

This is a **personal portfolio project** under active development, built collaboratively with AI coding assistants. The current version includes:

- [x] Project architecture and file structure
- [x] URL validation with SSRF protection
- [x] IPFS URL detection and gateway conversion
- [x] Metadata fetching with CORS proxy fallback
- [x] IPFS gateway fallback for reliability
- [x] Metadata parsing (Enjin, ERC-721, ERC-1155)
- [x] VirusTotal API integration (URL scanning)
- [x] VirusTotal file upload scanning (media files)
- [x] Safe media preview with blob URLs
- [x] Responsive mobile-first UI
- [x] Accessible pipeline status display
- [x] Result caching (sessionStorage for quota)
- [ ] Dark/light theme toggle
- [ ] Comprehensive test suite
- [x] GitHub Pages deployment
- [ ] GitHub Actions CI/CD pipeline

## Contributing

We welcome contributions to improve the NFT Metadata Scanner! This project demonstrates best practices in secure web development.

### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/nft-metadata-scanner.git`
3. Make changes in a feature branch
4. Test thoroughly across multiple browsers
5. Submit a pull request with detailed description

### Guidelines
- Follow OWASP security guidelines
- Maintain WCAG 2.1 AA accessibility standards
- Add JSDoc comments for new functions
- Test security features thoroughly
- Update documentation as needed

### Areas for Contribution
- Additional NFT standards support
- Enhanced security features
- Performance optimizations
- Internationalization (i18n)
- Dark/light theme implementation

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

## Author

**bladzv** — Cybersecurity-focused developer specializing in secure web applications and blockchain technology.

- [GitHub](https://github.com/bladzv)
- [LinkedIn](https://linkedin.com/in/bladzv)

---

*Built with ❤️ and AI assistance as a demonstration of secure web development practices in the NFT and blockchain space.*
