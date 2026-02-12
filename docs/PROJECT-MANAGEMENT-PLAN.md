# Project Management Plan
## NFT Metadata Scanner - Static Web App

> **Note:** This document was created as part of the project planning phase and serves as a template/reference for future projects. The current implementation may not fully align with all details described herein.

---

## Document Information

**Project Name:** NFT Metadata Scanner  
**Project Type:** Open Source Portfolio Project  
**Duration:** 4 weeks (80 hours)  
**Budget:** $0 (Free tier services only)  
**Team Size:** 1 (Solo developer)  
**Methodology:** Agile (1-week sprints)  
**Last Updated:** February 12, 2026

---

## 1. Project Overview

### 1.1 Project Summary

A client-side static web application that validates NFT metadata and associated media from URLs, with primary focus on Enjin Blockchain NFT standards. The application prioritizes security, transparency, and demonstrating cybersecurity best practices.

### 1.2 Project Goals

1. **Primary:** Create a working static web app for NFT metadata validation
2. **Secondary:** Demonstrate full-stack development and security skills
3. **Tertiary:** Build a portfolio-worthy open-source project

### 1.3 Success Criteria

- ✅ Deployed to GitHub Pages with working demo
- ✅ HTTPS and IPFS URL support functional
- ✅ VirusTotal integration operational
- ✅ All OWASP Top 10 considerations documented
- ✅ Mobile responsive design
- ✅ Complete documentation
- ✅ Lighthouse score >90

---

## 2. Project Phases & Timeline

### Sprint 1: Foundation & Core Validation (Week 1)
**Goal:** Working URL validation and basic UI

| Day | Tasks | Hours | Deliverables |
|-----|-------|-------|--------------|
| 1-2 | Project setup, file structure, basic HTML/CSS | 8 | Responsive UI shell |
| 3-4 | URL validator module, IPFS converter | 8 | URL validation working |
| 5 | Error handling, status display UI | 4 | User feedback system |
| 6-7 | Testing, documentation | 4 | Sprint 1 complete |

**Acceptance Criteria:**
- ✅ User can input HTTPS and IPFS URLs
- ✅ Invalid URLs show clear error messages
- ✅ IPFS URLs convert to HTTP gateways
- ✅ Status pipeline displays current step
- ✅ Mobile responsive

### Sprint 2: Security Integration (Week 2)
**Goal:** VirusTotal API integration

| Day | Tasks | Hours | Deliverables |
|-----|-------|-------|--------------|
| 8-9 | VirusTotal API client, rate limiter | 8 | VT URL scanning working |
| 10 | Metadata fetcher, CORS handling | 4 | Can fetch JSON from URLs |
| 11-12 | File upload to VT, scan results display | 8 | VT file scanning working |
| 13-14 | Error handling, API quota management, testing | 4 | Sprint 2 complete |

**Acceptance Criteria:**
- ✅ URLs scanned via VirusTotal before fetch
- ✅ Scan results displayed with detection counts
- ✅ Rate limiting prevents API quota exhaustion
- ✅ Works with and without API key
- ✅ Graceful handling of VT API failures

### Sprint 3: Metadata & Media Processing (Week 3)
**Goal:** Parse metadata and display media

| Day | Tasks | Hours | Deliverables |
|-----|-------|-------|--------------|
| 15-16 | JSON parser, Enjin standard validator | 8 | Metadata parsing working |
| 17 | Metadata display UI, raw JSON viewer | 4 | Metadata shown in UI |
| 18-19 | Media fetcher, file scanner, image display | 8 | Images displayed safely |
| 20-21 | XSS prevention, CSP implementation, testing | 4 | Sprint 3 complete |

**Acceptance Criteria:**
- ✅ Metadata parsed and validated
- ✅ Enjin, ERC-721, ERC-1155 formats supported
- ✅ Required fields validated
- ✅ Media URL extracted and scanned
- ✅ Images displayed with CSP protection
- ✅ All text sanitized (no XSS)

### Sprint 4: Polish & Deployment (Week 4)
**Goal:** Production-ready release

| Day | Tasks | Hours | Deliverables |
|-----|-------|-------|--------------|
| 22-23 | Comprehensive testing, bug fixes | 8 | All tests passing |
| 24 | Documentation (README, SECURITY, etc.) | 4 | Complete docs |
| 25-26 | GitHub Pages setup, CI/CD, SEO | 4 | Live deployment |
| 27-28 | Demo video, portfolio integration, launch | 4 | Public release |

**Acceptance Criteria:**
- ✅ All test cases pass
- ✅ Documentation complete
- ✅ Deployed to GitHub Pages
- ✅ Lighthouse score >90
- ✅ Zero ESLint errors
- ✅ OWASP Top 10 coverage documented

---

## 3. Work Breakdown Structure (WBS)

### 1.0 Project Setup
- 1.1 Create GitHub repository
- 1.2 Set up file structure
- 1.3 Configure ESLint
- 1.4 Create initial README

### 2.0 Frontend Development
- 2.1 HTML Structure
  - 2.1.1 Semantic HTML5
  - 2.1.2 SEO metadata
  - 2.1.3 Accessibility attributes
- 2.2 CSS Styling
  - 2.2.1 Responsive layout
  - 2.2.2 Component styles
  - 2.2.3 Dark mode (optional)
- 2.3 JavaScript Modules
  - 2.3.1 URL validator
  - 2.3.2 IPFS converter
  - 2.3.3 Metadata parser
  - 2.3.4 Security scanner
  - 2.3.5 UI controller

### 3.0 Security Implementation
- 3.1 Content Security Policy
- 3.2 XSS prevention
- 3.3 Input sanitization
- 3.4 VirusTotal integration
- 3.5 Rate limiting

### 4.0 Testing
- 4.1 Unit tests (manual)
- 4.2 Integration tests
- 4.3 Security tests
- 4.4 Cross-browser testing
- 4.5 Mobile testing

### 5.0 Documentation
- 5.1 Code comments
- 5.2 README.md
- 5.3 ARCHITECTURE.md
- 5.4 SECURITY.md
- 5.5 API_USAGE.md

### 6.0 Deployment
- 6.1 GitHub Pages setup
- 6.2 CI/CD pipeline
- 6.3 Domain configuration
- 6.4 Analytics setup

---

## 4. Risk Management

### 4.1 Technical Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| VirusTotal API rate limits exceeded | High | Medium | Implement aggressive client-side rate limiting, cache results, show quota warning |
| CORS issues with metadata URLs | High | High | Implement multiple CORS proxy fallbacks, clear error messages |
| Browser compatibility issues | Medium | Medium | Test on all major browsers early, use polyfills where needed |
| CSP blocking legitimate resources | Medium | High | Carefully test CSP rules, whitelist necessary domains |
| IPFS gateway downtime | Medium | Medium | Support multiple IPFS gateways with automatic fallback |

### 4.2 Project Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| Scope creep | Medium | High | Strict MVP focus, track Phase 2 ideas separately |
| Underestimated complexity | Medium | Medium | Buffer time in Sprint 4, prioritize core features |
| VirusTotal API changes | Low | High | Monitor VT API docs, abstract API layer for easy updates |
| Lost development time | Low | High | Daily commits, code backups, clear milestones |

### 4.3 Security Risks

| Risk | Probability | Impact | Mitigation Strategy |
|------|-------------|--------|---------------------|
| XSS vulnerability introduced | Medium | Critical | Mandatory sanitization, CSP enforcement, security testing |
| User uploads malicious metadata | High | Medium | Clear warnings, VirusTotal scanning, user responsibility disclaimer |
| VirusTotal false negatives | Low | High | Disclaimer that tool is for preview only, not guarantee |
| Privacy concerns (URL logging) | Low | Medium | No server-side logging, clear privacy policy |

---

## 5. Quality Assurance Plan

### 5.1 Code Quality Standards

**JavaScript:**
- ESLint: Airbnb style guide
- JSDoc comments for all functions
- Maximum function length: 50 lines
- Maximum file length: 300 lines
- No console.log in production (use debug flag)

**HTML:**
- Valid HTML5 (W3C validator)
- Semantic elements
- ARIA labels for accessibility

**CSS:**
- Stylelint configuration
- BEM naming convention
- No !important (exceptions documented)
- Mobile-first approach

### 5.2 Testing Checklist

**Functional Testing:**
- [ ] Valid HTTPS URL accepted
- [ ] Valid IPFS URL accepted
- [ ] Invalid protocol rejected
- [ ] Malformed JSON handled
- [ ] Missing metadata fields detected
- [ ] Image loads and displays
- [ ] VirusTotal scans execute
- [ ] Rate limiting works
- [ ] All error states tested

**Security Testing:**
- [ ] XSS attempts blocked
- [ ] CSP policy enforced
- [ ] Dangerous URLs rejected
- [ ] File size limits enforced
- [ ] No inline scripts execute
- [ ] SRI hashes on CDN resources
- [ ] HTTPS enforced
- [ ] Input sanitization working

**Cross-Browser Testing:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari iOS
- [ ] Chrome Android

**Performance Testing:**
- [ ] Lighthouse score >90
- [ ] Page load <2s
- [ ] API calls <10s timeout
- [ ] No memory leaks
- [ ] Smooth animations (60fps)

**Accessibility Testing:**
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast WCAG AA
- [ ] Focus indicators visible
- [ ] Alt text on images

### 5.3 Definition of Done

A feature is "Done" when:
1. ✅ Code written and self-reviewed
2. ✅ ESLint passes with 0 errors
3. ✅ Manually tested in 3+ browsers
4. ✅ Security implications considered
5. ✅ JSDoc comments added
6. ✅ Committed to Git with clear message
7. ✅ Relevant documentation updated
8. ✅ No console errors in production build

---

## 6. Development Guidelines

### 6.1 Git Workflow

**Branch Strategy:**
- `main` - production code (GitHub Pages)
- `develop` - integration branch
- `feature/*` - feature branches
- `bugfix/*` - bug fixes

**Commit Messages:**
```
<type>(<scope>): <subject>

<body>

<footer>

Types: feat, fix, docs, style, refactor, test, chore
Example: feat(validator): add IPFS URL support
```

**Pull Request Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Security fix

## Testing
- [ ] Tested manually
- [ ] Browser tested
- [ ] Security tested

## Checklist
- [ ] Code follows style guide
- [ ] Self-reviewed
- [ ] Documentation updated
- [ ] No console warnings
```

### 6.2 Security Development Lifecycle

**Phase 1: Design**
- Threat modeling for each feature
- OWASP Top 10 review
- Security requirements defined

**Phase 2: Implementation**
- Secure coding practices
- Input validation
- Output encoding
- CSP enforcement

**Phase 3: Testing**
- Security test cases
- XSS testing
- Manual penetration testing
- Dependency scanning

**Phase 4: Deployment**
- Security headers verified
- HTTPS enforced
- No secrets in code
- GitHub security advisories enabled

### 6.3 Code Review Checklist

**Functionality:**
- [ ] Code does what it's supposed to
- [ ] Edge cases handled
- [ ] Error handling comprehensive

**Security:**
- [ ] No XSS vulnerabilities
- [ ] Input validated
- [ ] Output sanitized
- [ ] CSP compatible

**Performance:**
- [ ] No unnecessary API calls
- [ ] Efficient DOM manipulation
- [ ] No memory leaks

**Maintainability:**
- [ ] Code is readable
- [ ] Comments explain why, not what
- [ ] Functions are single-purpose
- [ ] No code duplication

---

## 7. Communication Plan

### 7.1 Documentation Updates

**Daily:**
- Commit messages (what changed)
- Console logs for debugging

**Weekly:**
- README.md (progress updates)
- CHANGELOG.md (completed features)

**Sprint End:**
- Sprint retrospective (lessons learned)
- Roadmap update
- Documentation review

### 7.2 Stakeholder Communication

**For Recruiters/Hiring Managers:**
- README highlights key skills
- Architecture docs show system design
- Security docs demonstrate awareness
- Clean commit history shows process

**For Open Source Contributors:**
- CONTRIBUTING.md guidelines
- Code of Conduct
- Issue templates
- Clear roadmap

---

## 8. Tools & Resources

### 8.1 Development Tools

**Code Editor:** VS Code
**Extensions:**
- ESLint
- Prettier
- Live Server
- GitLens

**Version Control:** Git + GitHub

**Testing:**
- Browser DevTools
- Lighthouse
- WAVE (accessibility)

**Design:**
- Figma (optional mockups)
- Excalidraw (diagrams)

### 8.2 External Services

**Free Tier Services:**
- VirusTotal API (4 req/min)
- GitHub Pages (hosting)
- IPFS public gateways
- CORS proxies (allorigins.win)

**Optional:**
- Google Analytics (traffic)
- Cloudflare (CDN, optional)

---

## 9. Sprint Planning Details

### Sprint 1 Detailed Tasks

**Day 1: Project Setup (4 hours)**
- Initialize Git repository
- Create file structure
- Set up ESLint config
- Create basic HTML skeleton
- Write initial README

**Day 2: UI Foundation (4 hours)**
- Implement responsive CSS layout
- Create input form
- Design status pipeline UI
- Add example URLs
- Mobile testing

**Day 3: URL Validator (4 hours)**
- Write URL validation logic
- Test HTTPS validation
- Test invalid protocol rejection
- Implement error display
- Unit test cases

**Day 4: IPFS Support (4 hours)**
- IPFS URL detection
- Gateway conversion logic
- Test with real IPFS URLs
- Error handling
- Documentation

**Day 5: Status Display (4 hours)**
- Implement status state machine
- Create visual indicators
- Add loading animations
- Test all states
- Responsive check

**Day 6-7: Sprint Review (4 hours)**
- End-to-end testing
- Fix bugs
- Update documentation
- Sprint retrospective
- Plan Sprint 2

### Sprint 2 Detailed Tasks

**Day 8: VT API Setup (4 hours)**
- Research VT API v3
- Create API client module
- Test URL scan endpoint
- Implement response parsing
- Error handling

**Day 9: Rate Limiting (4 hours)**
- Implement rate limiter class
- Test rate limiting logic
- Add quota display to UI
- Cache scan results
- Documentation

**Day 10: Metadata Fetcher (4 hours)**
- Implement fetch with timeout
- CORS handling strategy
- Test with various URLs
- Error display
- Progress indicators

**Day 11: File Upload (4 hours)**
- Implement VT file upload
- Progress tracking
- Handle large files
- File size validation
- Error handling

**Day 12: Scan Results (4 hours)**
- Design scan results UI
- Parse VT response
- Display detection counts
- Warning thresholds
- User decision flow

**Day 13-14: Sprint Review (4 hours)**
- Integration testing
- API quota testing
- Bug fixes
- Documentation
- Sprint retrospective

### Sprint 3 Detailed Tasks

**Day 15: Metadata Parser (4 hours)**
- JSON parser with error handling
- Enjin standard validation
- Required fields check
- Test cases
- Error messages

**Day 16: Multi-Standard Support (4 hours)**
- Detect metadata standard
- ERC-721 support
- ERC-1155 support
- Fallback handling
- Documentation

**Day 17: Metadata Display (4 hours)**
- Create metadata view UI
- Raw JSON viewer
- Collapsible sections
- Copy to clipboard
- Responsive design

**Day 18: Media Fetcher (4 hours)**
- Extract image URL
- Implement download logic
- File size check
- Progress display
- Error handling

**Day 19: Media Scanner (4 hours)**
- Upload to VirusTotal
- Display scan results
- User approval flow
- Timeout handling
- Error states

**Day 20: XSS Prevention (4 hours)**
- Implement sanitization
- Test XSS payloads
- CSP configuration
- Verify no inline scripts
- Security testing

**Day 21: Sprint Review (4 hours)**
- Full flow testing
- Security audit
- Bug fixes
- Documentation
- Sprint retrospective

### Sprint 4 Detailed Tasks

**Day 22: Testing Suite (4 hours)**
- Write test cases
- Cross-browser testing
- Mobile device testing
- Performance testing
- Accessibility audit

**Day 23: Bug Fixes (4 hours)**
- Fix discovered issues
- Edge case handling
- Polish UI
- Optimize performance
- Final security check

**Day 24: Documentation (4 hours)**
- Complete README
- Write ARCHITECTURE.md
- Write SECURITY.md
- Write API_USAGE.md
- Code comments review

**Day 25: GitHub Pages (2 hours)**
- Configure GitHub Pages
- Set up custom domain (optional)
- Test live deployment
- SEO metadata
- Analytics setup

**Day 26: CI/CD (2 hours)**
- GitHub Actions workflow
- Automated linting
- Deployment automation
- Badge setup
- Test pipeline

**Day 27: Portfolio Integration (2 hours)**
- Create demo video
- Screenshot gallery
- Update personal portfolio
- LinkedIn post
- Twitter announcement

**Day 28: Launch (2 hours)**
- Final checks
- Public release
- Submit to directories
- Blog post
- Monitor feedback

---

## 10. Daily Checklist

**Every Development Day:**
- [ ] Review previous day's work
- [ ] Check for security implications
- [ ] Write clean, commented code
- [ ] Test in 2+ browsers
- [ ] Commit with clear message
- [ ] Update documentation
- [ ] Log time spent
- [ ] Plan next day

**Every Sprint End:**
- [ ] Full testing pass
- [ ] Documentation review
- [ ] Sprint retrospective
- [ ] Update roadmap
- [ ] Plan next sprint

---

## 11. Retrospective Template

**Sprint X Retrospective:**

**What Went Well:**
- [List successes]

**What Didn't Go Well:**
- [List challenges]

**What to Improve:**
- [Action items]

**Lessons Learned:**
- [Key takeaways]

**Time Tracking:**
- Planned: X hours
- Actual: Y hours
- Variance: Z hours

---

## 12. Post-Launch Activities

**Week 5-6: Community Building**
- Respond to issues
- Review pull requests
- Update documentation based on feedback
- Fix critical bugs

**Week 7-8: Promotion**
- Submit to awesome lists
- Post on Reddit (r/webdev, r/nft)
- Dev.to article
- YouTube demo video

**Month 2-3: Iteration**
- Implement Phase 2 features based on feedback
- Performance optimizations
- Additional NFT standards
- Video support

---

## 13. File Structure Reference

```
nft-metadata-scanner/
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

---

## 14. Resources & References

**Development:**
- [MDN Web Docs](https://developer.mozilla.org)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [VirusTotal API Docs](https://developers.virustotal.com/reference/overview)

**Design:**
- [Material Design](https://material.io)
- [Tailwind CSS](https://tailwindcss.com)
- [Color Palette Generator](https://coolors.co)

**Testing:**
- [Can I Use](https://caniuse.com)
- [WebPageTest](https://www.webpagetest.org)
- [WAVE Accessibility](https://wave.webaim.org)

**Security:**
- [Content Security Policy](https://content-security-policy.com)
- [Security Headers](https://securityheaders.com)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org)

---

## 15. Key Milestones & Dates

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Sprint 1 Complete | End of Week 1 | Pending |
| Sprint 2 Complete | End of Week 2 | Pending |
| Sprint 3 Complete | End of Week 3 | Pending |
| MVP Launch | End of Week 4 | Pending |
| First 10 GitHub Stars | Week 6 | Pending |
| Feature Complete v1.0 | Week 8 | Pending |
| 50+ GitHub Stars | Month 6 | Pending |

---

## 16. Budget Breakdown

**Total Budget:** $0

**Free Services:**
- GitHub (repository hosting): $0
- GitHub Pages (deployment): $0
- VirusTotal API (free tier): $0
- IPFS Gateways (public): $0
- CORS Proxy (public): $0
- Development Tools (VS Code, Git): $0

**Optional Future Costs:**
- Custom domain: ~$12/year (not included in MVP)
- VirusTotal Premium API: $0 (not needed for MVP)
- CDN service: $0 (GitHub Pages sufficient)

---

## 17. Success Metrics Dashboard

### Technical Quality
- [ ] Lighthouse Performance: >90
- [ ] Lighthouse Accessibility: >90
- [ ] Lighthouse Best Practices: >90
- [ ] Lighthouse SEO: >90
- [ ] ESLint Errors: 0
- [ ] ESLint Warnings: 0
- [ ] W3C HTML Validation: Pass
- [ ] CSS Validation: Pass

### Security Compliance
- [ ] All OWASP Top 10 addressed
- [ ] CSP fully configured
- [ ] XSS tests passed
- [ ] Input sanitization complete
- [ ] HTTPS enforced
- [ ] SRI on all CDN resources

### Documentation Quality
- [ ] README.md complete
- [ ] ARCHITECTURE.md complete
- [ ] SECURITY.md complete
- [ ] API_USAGE.md complete
- [ ] All functions documented
- [ ] Example usage provided

### Deployment Status
- [ ] GitHub Pages live
- [ ] CI/CD pipeline working
- [ ] Demo accessible
- [ ] Mobile responsive verified
- [ ] Cross-browser tested

---

## 18. Risk Register

| ID | Risk | Owner | Status | Mitigation | Review Date |
|----|------|-------|--------|------------|-------------|
| R1 | VT API rate limit | Dev | Active | Rate limiter implemented | Weekly |
| R2 | CORS issues | Dev | Active | Multiple proxy fallbacks | Weekly |
| R3 | XSS vulnerability | Dev | Active | CSP + sanitization | Daily |
| R4 | Scope creep | PM | Active | MVP focus, backlog | Weekly |
| R5 | Browser compatibility | Dev | Active | Cross-browser testing | Sprint end |

---

## 19. Change Log Template

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.0.0] - 2026-XX-XX

### Added
- Initial release
- HTTPS and IPFS URL support
- VirusTotal integration
- Enjin metadata standard support
- Mobile responsive design

### Security
- Content Security Policy implemented
- XSS protection
- Input sanitization
- Rate limiting

## [0.1.0] - 2026-XX-XX

### Added
- Project structure
- Basic UI
- URL validator
```

---

## 20. Launch Checklist

**Pre-Launch:**
- [ ] All features working
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Security audit done
- [ ] Performance optimized
- [ ] Cross-browser tested
- [ ] Mobile tested
- [ ] Accessibility verified

**Launch Day:**
- [ ] Deploy to GitHub Pages
- [ ] Verify live site works
- [ ] Create GitHub release (v1.0.0)
- [ ] Update README with live link
- [ ] Create demo video
- [ ] Take screenshots

**Post-Launch:**
- [ ] Social media posts
- [ ] Submit to directories
- [ ] Monitor for issues
- [ ] Respond to feedback
- [ ] Plan next iteration

---

**END OF PROJECT MANAGEMENT PLAN**
