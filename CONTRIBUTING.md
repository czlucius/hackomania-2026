# Contributing to Telegram Fake News Checker

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## 🌟 Ways to Contribute

- **Report Bugs**: Found a bug? Open an issue with details
- **Suggest Features**: Have an idea? Share it in discussions
- **Improve Documentation**: Help make docs clearer and more comprehensive
- **Submit Code**: Fix bugs or implement new features
- **Test**: Try the extension and report your experience
- **Translate**: Help translate the extension to other languages

## 🚀 Getting Started

### Prerequisites

- Git
- Chrome browser (version 88+)
- Basic knowledge of JavaScript, HTML, CSS
- Python 3.6+ (for icon generation)

### Setup Development Environment

1. **Fork the Repository**
   ```bash
   # Click "Fork" button on GitHub, then:
   git clone https://github.com/YOUR-USERNAME/telegram-fake-news-checker.git
   cd telegram-fake-news-checker
   ```

2. **Create Icon Files**
   ```bash
   cd hackomania2026
   python3 create_icons.py
   ```

3. **Load Extension in Chrome**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `hackomania2026` folder

4. **Test on Telegram Web**
   - Open https://web.telegram.org
   - Verify extension works correctly

## 📝 Contribution Workflow

### 1. Create an Issue

Before starting work:
- Check if an issue already exists
- If not, create a new issue describing your proposed changes
- Wait for maintainer feedback (usually within 48 hours)

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding tests

### 3. Make Your Changes

#### Code Style

**JavaScript:**
- Use 2 spaces for indentation
- Use single quotes for strings
- Add JSDoc comments for functions
- Use meaningful variable names
- Keep functions small and focused

**Example:**
```javascript
/**
 * Analyze message text for potential misinformation
 * @param {string} text - Message text to analyze
 * @returns {Object} Analysis result with risk score and flags
 */
function analyzeMessage(text) {
  // Implementation
}
```

**CSS:**
- Use kebab-case for class names
- Organize related styles together
- Comment complex CSS rules
- Prefer modern CSS features

**HTML:**
- Use semantic HTML5 elements
- Ensure accessibility (ARIA labels, alt text)
- Keep structure clean and readable

#### Testing Your Changes

1. **Manual Testing:**
   - Test on Telegram Web with various message types
   - Try all extension features
   - Test on different screen sizes
   - Check console for errors

2. **Test Messages:**
   Use the examples in `test-page.html` to verify detection works

3. **Browser Compatibility:**
   - Test in Chrome (primary)
   - Check manifest v3 compliance

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add support for Spanish language detection"
```

**Commit Message Format:**
```
type: subject

body (optional)

footer (optional)
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting, no code change
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples:**
```
feat: add German language support for keyword detection

fix: resolve issue with message observer not detecting new messages

docs: update installation instructions for Windows users

refactor: improve risk scoring algorithm efficiency
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then on GitHub:
1. Click "New Pull Request"
2. Select your branch
3. Fill in the PR template:
   - Description of changes
   - Related issue number
   - Screenshots (if UI changes)
   - Testing done

## 🐛 Reporting Bugs

### Before Reporting

- Check if the bug is already reported
- Test on latest version
- Verify it's not a configuration issue

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- Chrome Version: [e.g. 120.0.6099.109]
- Extension Version: [e.g. 1.0.0]
- OS: [e.g. Windows 11, macOS 14]

**Console Errors**
Any errors from browser console (F12).

**Additional context**
Any other relevant information.
```

## 💡 Suggesting Features

### Feature Request Template

```markdown
**Is your feature related to a problem?**
Describe the problem or limitation.

**Describe the solution**
What would you like to happen?

**Describe alternatives**
Alternative solutions you've considered.

**Additional context**
Mockups, examples, or related features.

**Implementation ideas**
If you have technical suggestions.
```

## 🔍 Code Review Process

1. **Automated Checks:**
   - Code must follow style guidelines
   - No console errors
   - Extension must load successfully

2. **Manual Review:**
   - Maintainers review code quality
   - Test functionality
   - Check documentation

3. **Feedback:**
   - Address review comments
   - Update PR as needed
   - Re-request review

4. **Merge:**
   - Approved PRs are merged by maintainers
   - Your contribution will be credited

## 🎯 Priority Areas

We especially welcome contributions in:

### High Priority
- **Multi-language Support**: Expand detection to non-English languages
- **API Integrations**: Add more fact-checking APIs
- **Performance**: Optimize message scanning
- **Accessibility**: Improve screen reader support

### Medium Priority
- **UI/UX Improvements**: Better visual design
- **Statistics**: Enhanced analytics dashboard
- **Export Features**: Save flagged messages
- **Custom Rules**: User-defined keywords

### Documentation
- Tutorial videos
- Translation of docs
- Use case examples
- FAQ expansion

## 📚 Resources

### Understanding the Codebase

**File Structure:**
```
hackomania2026/
├── manifest.json       # Extension configuration
├── content.js          # Main logic (message analysis)
├── content.css         # Styles for indicators
├── service-worker.js   # Background tasks (API calls)
├── popup.html          # Settings UI
├── popup.js           # Popup interactions
└── images/            # Extension icons
```

**Key Functions:**
- `analyzeMessage()` - Analyzes individual messages
- `performLocalAnalysis()` - Local heuristic checks
- `checkWithAPI()` - External fact-checking
- `addWarningIndicator()` - Display warnings

### Useful Links
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)

## ❓ Questions?

- **General Questions**: Open a discussion on GitHub
- **Bug Reports**: Create an issue
- **Security Issues**: Email security@example.com (private)
- **Feature Ideas**: Start a discussion thread

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in this project a harassment-free experience for everyone.

### Our Standards

**Positive behavior:**
- Using welcoming and inclusive language
- Respecting differing viewpoints
- Accepting constructive criticism
- Focusing on what's best for the community

**Unacceptable behavior:**
- Harassment or discriminatory comments
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information
- Other unprofessional conduct

### Enforcement

Report violations to project maintainers. All complaints will be reviewed and investigated.

## 🏆 Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contribution graph

Thank you for helping make the internet more informed! 🛡️

---

**Questions about contributing?** Open a discussion or reach out to maintainers.