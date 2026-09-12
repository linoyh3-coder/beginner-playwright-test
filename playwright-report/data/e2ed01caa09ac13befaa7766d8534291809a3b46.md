# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: example.spec.ts >> homepage hero matches its visual snapshot
- Location: tests\example.spec.ts:23:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('header.hero').getByRole('heading', { level: 1 })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('header.hero').getByRole('heading', { level: 1 }) with timeout 5000ms
  - waiting for locator('header.hero').getByRole('heading', { level: 1 })

```

```yaml
- region "Skip to main content":
  - link "Skip to main content":
    - /url: "#__docusaurus_skipToContent_fallback"
- navigation "Main":
  - link "Playwright logo Playwright":
    - /url: /
    - img "Playwright logo"
    - text: Playwright
  - link "Docs":
    - /url: /docs/intro
  - link "MCP":
    - /url: /mcp/introduction
  - link "CLI":
    - /url: /agent-cli/introduction
  - link "API":
    - /url: /docs/api/class-playwright
  - button "Node.js"
  - link "GitHub repository":
    - /url: https://github.com/microsoft/playwright
  - link "Discord server":
    - /url: https://aka.ms/playwright/discord
  - button "Switch between dark and light mode (currently system mode)"
  - button "Search (Control+k)": Search Ctrl K
- complementary:
  - navigation "Docs sidebar":
    - list:
      - listitem:
        - button "Getting Started" [expanded]
        - list:
          - listitem:
            - link "Installation":
              - /url: /docs/intro
          - listitem:
            - link "Writing tests":
              - /url: /docs/writing-tests
          - listitem:
            - link "Generating tests":
              - /url: /docs/codegen-intro
          - listitem:
            - link "Running and debugging tests":
              - /url: /docs/running-tests
          - listitem:
            - link "Trace viewer":
              - /url: /docs/trace-viewer-intro
          - listitem:
            - link "Setting up CI":
              - /url: /docs/ci-intro
          - listitem:
            - link "VS Code":
              - /url: /docs/getting-started-vscode
      - listitem:
        - link "Release notes":
          - /url: /docs/release-notes
      - listitem:
        - link "Canary releases":
          - /url: /docs/canary-releases
      - listitem:
        - button "Playwright Test" [expanded]
        - list:
          - listitem:
            - link "Agents":
              - /url: /docs/test-agents
          - listitem:
            - link "Annotations":
              - /url: /docs/test-annotations
          - listitem:
            - link "Command line":
              - /url: /docs/test-cli
          - listitem:
            - link "Configuration":
              - /url: /docs/test-configuration
          - listitem:
            - link "Configuration (use)":
              - /url: /docs/test-use-options
          - listitem:
            - link "Emulation":
              - /url: /docs/emulation
          - listitem:
            - link "Fixtures":
              - /url: /docs/test-fixtures
          - listitem:
            - link "Global setup and teardown":
              - /url: /docs/test-global-setup-teardown
          - listitem:
            - link "Parallelism":
              - /url: /docs/test-parallel
          - listitem:
            - link "Parameterize tests":
              - /url: /docs/test-parameterize
          - listitem:
            - link "Projects":
              - /url: /docs/test-projects
          - listitem:
            - link "Reporters":
              - /url: /docs/test-reporters
          - listitem:
            - link "Retries":
              - /url: /docs/test-retries
          - listitem:
            - link "Sharding":
              - /url: /docs/test-sharding
          - listitem:
            - link "Timeouts":
              - /url: /docs/test-timeouts
          - listitem:
            - link "TypeScript":
              - /url: /docs/test-typescript
          - listitem:
            - link "UI Mode":
              - /url: /docs/test-ui-mode
          - listitem:
            - link "Web server":
              - /url: /docs/test-webserver
      - listitem:
        - button "Guides" [expanded]
        - list:
          - listitem:
            - link "Library":
              - /url: /docs/library
          - listitem:
            - link "Accessibility testing":
              - /url: /docs/accessibility-testing
          - listitem:
            - link "Actions":
              - /url: /docs/input
          - listitem:
            - link "Assertions":
              - /url: /docs/test-assertions
          - listitem:
            - link "API testing":
              - /url: /docs/api-testing
          - listitem:
            - link "Authentication":
              - /url: /docs/auth
          - listitem:
            - link "Auto-waiting":
              - /url: /docs/actionability
          - listitem:
            - link "Best Practices":
              - /url: /docs/best-practices
          - listitem:
            - link "Browsers":
              - /url: /docs/browsers
          - listitem:
            - link "Chrome extensions":
              - /url: /docs/chrome-extensions
          - listitem:
            - link "Clock":
              - /url: /docs/clock
          - listitem:
            - link "Component testing":
              - /url: /docs/test-components
          - listitem:
            - link "Debugging Tests":
              - /url: /docs/debug
          - listitem:
            - link "Dialogs":
              - /url: /docs/dialogs
          - listitem:
            - link "Downloads":
              - /url: /docs/downloads
          - listitem:
            - link "Evaluating JavaScript":
              - /url: /docs/evaluating
          - listitem:
            - link "Events":
              - /url: /docs/events
          - listitem:
            - link "Extensibility":
              - /url: /docs/extensibility
          - listitem:
            - link "Frames":
              - /url: /docs/frames
          - listitem:
            - link "Handles":
              - /url: /docs/handles
          - listitem:
            - link "Isolation":
              - /url: /docs/browser-contexts
          - listitem:
            - link "Locators":
              - /url: /docs/locators
          - listitem:
            - link "Mock APIs":
              - /url: /docs/mock
          - listitem:
            - link "Mock browser APIs":
              - /url: /docs/mock-browser-apis
          - listitem:
            - link "Navigations":
              - /url: /docs/navigations
          - listitem:
            - link "Network":
              - /url: /docs/network
          - listitem:
            - link "Other locators":
              - /url: /docs/other-locators
          - listitem:
            - link "Pages":
              - /url: /docs/pages
          - listitem:
            - link "Page object models":
              - /url: /docs/pom
          - listitem:
            - link "Screenshots":
              - /url: /docs/screenshots
          - listitem:
            - link "Service Workers":
              - /url: /docs/service-workers
          - listitem:
            - link "Snapshot testing":
              - /url: /docs/aria-snapshots
          - listitem:
            - link "Test generator":
              - /url: /docs/codegen
          - listitem:
            - link "Touch events (legacy)":
              - /url: /docs/touch-events
          - listitem:
            - link "Trace viewer":
              - /url: /docs/trace-viewer
          - listitem:
            - link "Videos":
              - /url: /docs/videos
          - listitem:
            - link "Visual comparisons":
              - /url: /docs/test-snapshots
          - listitem:
            - link "WebView2":
              - /url: /docs/webview2
      - listitem:
        - button "Migration"
      - listitem:
        - button "Integrations"
      - listitem:
        - link "Supported languages":
          - /url: /docs/languages
- main:
  - article:
    - navigation "Breadcrumbs":
      - list:
        - listitem:
          - link "Home page":
            - /url: /
            - img
        - listitem: Getting Started
        - listitem: Installation
    - heading "Installation" [level=1]
    - heading "IntroductionDirect link to Introduction" [level=2]:
      - text: Introduction
      - link "Direct link to Introduction":
        - /url: "#introduction"
        - text: "#"
    - paragraph: Playwright Test is an end-to-end test framework for modern web apps. It bundles test runner, assertions, isolation, parallelization and rich tooling. Playwright supports Chromium, WebKit and Firefox on Windows, Linux and macOS, locally or in CI, headless or headed, with native mobile emulation for Chrome (Android) and Mobile Safari.
    - paragraph:
      - strong: You will learn
    - list:
      - listitem:
        - link "How to install Playwright":
          - /url: /docs/intro#installing-playwright
      - listitem:
        - link "What's installed":
          - /url: /docs/intro#whats-installed
      - listitem:
        - link "How to run the example test":
          - /url: /docs/intro#running-the-example-test
      - listitem:
        - link "How to open the HTML test report":
          - /url: /docs/intro#html-test-reports
    - heading "Installing PlaywrightDirect link to Installing Playwright" [level=2]:
      - text: Installing Playwright
      - link "Direct link to Installing Playwright":
        - /url: "#installing-playwright"
        - text: "#"
    - paragraph: Get started by installing Playwright using one of the following methods.
    - heading "Using npm, yarn or pnpmDirect link to Using npm, yarn or pnpm" [level=3]:
      - text: Using npm, yarn or pnpm
      - link "Direct link to Using npm, yarn or pnpm":
        - /url: "#using-npm-yarn-or-pnpm"
        - text: "#"
    - paragraph: The command below either initializes a new project or adds Playwright to an existing one.
    - tablist:
      - tab "npm" [selected]
      - tab "yarn"
      - tab "pnpm"
    - tabpanel:
      - code: npm init playwright@latest
      - button "Copy code to clipboard"
    - paragraph: "When prompted, choose / confirm:"
    - list:
      - listitem: "TypeScript or JavaScript (default: TypeScript)"
      - listitem:
        - text: "Tests folder name (default:"
        - code: tests
        - text: ", or"
        - code: e2e
        - text: if
        - code: tests
        - text: already exists)
      - listitem: Add a GitHub Actions workflow (recommended for CI)
      - listitem: "Install Playwright browsers (default: yes)"
    - paragraph: You can re-run the command later; it does not overwrite existing tests.
    - heading "Using the VS Code ExtensionDirect link to Using the VS Code Extension" [level=3]:
      - text: Using the VS Code Extension
      - link "Direct link to Using the VS Code Extension":
        - /url: "#using-the-vs-code-extension"
        - text: "#"
    - paragraph:
      - text: You can also create and run tests with the
      - link "VS Code Extension":
        - /url: /docs/getting-started-vscode
      - text: .
    - heading "What's InstalledDirect link to What's Installed" [level=2]:
      - text: What's Installed
      - link "Direct link to What's Installed":
        - /url: "#whats-installed"
        - text: "#"
    - paragraph: Playwright downloads required browser binaries and creates the scaffold below.
    - code: "playwright.config.ts # Test configuration package.json package-lock.json # Or yarn.lock / pnpm-lock.yaml tests/ example.spec.ts # Minimal example test"
    - button "Copy code to clipboard"
    - paragraph:
      - text: The
      - link "playwright.config":
        - /url: /docs/test-configuration
      - text: "centralizes configuration: target browsers, timeouts, retries, projects, reporters and more. In existing projects dependencies are added to your current"
      - code: package.json
      - text: .
    - paragraph:
      - code: tests/
      - text: contains a minimal starter test.
    - heading "Running the Example TestDirect link to Running the Example Test" [level=2]:
      - text: Running the Example Test
      - link "Direct link to Running the Example Test":
        - /url: "#running-the-example-test"
        - text: "#"
    - paragraph:
      - text: By default tests run headless in parallel across Chromium, Firefox and WebKit (configurable in
      - link "playwright.config":
        - /url: /docs/test-configuration
      - text: ). Output and aggregated results display in the terminal.
    - tablist:
      - tab "npm" [selected]
      - tab "yarn"
      - tab "pnpm"
    - tabpanel:
      - code: npx playwright test
      - button "Copy code to clipboard"
    - paragraph:
      - img "tests running in command line"
    - paragraph: "Tips:"
    - list:
      - listitem:
        - text: "See the browser window: add"
        - code: "--headed"
        - text: .
      - listitem:
        - text: "Run a single project/browser:"
        - code: "--project=chromium"
        - text: .
      - listitem:
        - text: "Run one file:"
        - code: npx playwright test tests/example.spec.ts
        - text: .
      - listitem:
        - text: "Open testing UI:"
        - code: "--ui"
        - text: .
    - paragraph:
      - text: See
      - link "Running Tests":
        - /url: /docs/running-tests
      - text: for details on filtering, headed mode, sharding and retries.
    - heading "HTML Test ReportsDirect link to HTML Test Reports" [level=2]:
      - text: HTML Test Reports
      - link "Direct link to HTML Test Reports":
        - /url: "#html-test-reports"
        - text: "#"
    - paragraph:
      - text: After a test run, the
      - link "HTML Reporter":
        - /url: /docs/test-reporters#html-reporter
      - text: provides a dashboard filterable by the browser, passed, failed, skipped, flaky and more. Click a test to inspect errors, attachments and steps. It auto-opens only when failures occur; open manually with the command below.
    - tablist:
      - tab "npm" [selected]
      - tab "yarn"
      - tab "pnpm"
    - tabpanel:
      - code: npx playwright show-report
      - button "Copy code to clipboard"
    - paragraph:
      - img "HTML Report"
    - heading "Running the Example Test in UI ModeDirect link to Running the Example Test in UI Mode" [level=2]:
      - text: Running the Example Test in UI Mode
      - link "Direct link to Running the Example Test in UI Mode":
        - /url: "#running-the-example-test-in-ui-mode"
        - text: "#"
    - paragraph:
      - text: Run tests with
      - link "UI Mode":
        - /url: /docs/test-ui-mode
      - text: for watch mode, live step view, time travel debugging and more.
    - tablist:
      - tab "npm" [selected]
      - tab "yarn"
      - tab "pnpm"
    - tabpanel:
      - code: npx playwright test --ui
      - button "Copy code to clipboard"
    - paragraph:
      - img "UI Mode"
    - paragraph:
      - text: See the
      - link "detailed guide on UI Mode":
        - /url: /docs/test-ui-mode
      - text: for watch filters, step details and trace integration.
    - heading "Updating PlaywrightDirect link to Updating Playwright" [level=2]:
      - text: Updating Playwright
      - link "Direct link to Updating Playwright":
        - /url: "#updating-playwright"
        - text: "#"
    - paragraph: "Update Playwright and download new browser binaries and their dependencies:"
    - tablist:
      - tab "npm" [selected]
      - tab "yarn"
      - tab "pnpm"
    - tabpanel:
      - code: npm install -D @playwright/test@latest npx playwright install --with-deps
      - button "Copy code to clipboard"
    - paragraph: "Check your installed version:"
    - tablist:
      - tab "npm" [selected]
      - tab "yarn"
      - tab "pnpm"
    - tabpanel:
      - code: npx playwright --version
      - button "Copy code to clipboard"
    - heading "System requirementsDirect link to System requirements" [level=2]:
      - text: System requirements
      - link "Direct link to System requirements":
        - /url: "#system-requirements"
        - text: "#"
    - list:
      - listitem: "Node.js: latest 22.x, 24.x or 26.x."
      - listitem: Windows 11+, Windows Server 2019+ or Windows Subsystem for Linux (WSL).
      - listitem: macOS 14 (Sonoma) or later.
      - listitem: Debian 12 / 13, Ubuntu 22.04 / 24.04 / 26.04 (x86-64 or arm64).
    - heading "What's nextDirect link to What's next" [level=2]:
      - text: What's next
      - link "Direct link to What's next":
        - /url: "#whats-next"
        - text: "#"
    - list:
      - listitem:
        - link "Write tests using web-first assertions, fixtures and locators":
          - /url: /docs/writing-tests
      - listitem:
        - link "Run single or multiple tests; headed mode":
          - /url: /docs/running-tests
      - listitem:
        - link "Generate tests with Codegen":
          - /url: /docs/codegen-intro
      - listitem:
        - link "View a trace of your tests":
          - /url: /docs/trace-viewer-intro
  - navigation "Docs pages":
    - link "Next Writing tests »":
      - /url: /docs/writing-tests
  - list:
    - listitem:
      - link "Introduction":
        - /url: "#introduction"
    - listitem:
      - link "Installing Playwright":
        - /url: "#installing-playwright"
      - list:
        - listitem:
          - link "Using npm, yarn or pnpm":
            - /url: "#using-npm-yarn-or-pnpm"
        - listitem:
          - link "Using the VS Code Extension":
            - /url: "#using-the-vs-code-extension"
    - listitem:
      - link "What's Installed":
        - /url: "#whats-installed"
    - listitem:
      - link "Running the Example Test":
        - /url: "#running-the-example-test"
    - listitem:
      - link "HTML Test Reports":
        - /url: "#html-test-reports"
    - listitem:
      - link "Running the Example Test in UI Mode":
        - /url: "#running-the-example-test-in-ui-mode"
    - listitem:
      - link "Updating Playwright":
        - /url: "#updating-playwright"
    - listitem:
      - link "System requirements":
        - /url: "#system-requirements"
    - listitem:
      - link "What's next":
        - /url: "#whats-next"
- contentinfo:
  - text: Learn
  - list:
    - listitem:
      - link "Getting started":
        - /url: /docs/intro
    - listitem:
      - link "Playwright Training(opens in new tab)":
        - /url: https://learn.microsoft.com/en-us/training/modules/build-with-playwright/
        - text: Playwright Training
        - img "(opens in new tab)"
    - listitem:
      - link "Learn Videos":
        - /url: /community/learn-videos
    - listitem:
      - link "Feature Videos":
        - /url: /community/feature-videos
  - text: Community
  - list:
    - listitem:
      - link "Stack Overflow(opens in new tab)":
        - /url: https://stackoverflow.com/questions/tagged/playwright
        - text: Stack Overflow
        - img "(opens in new tab)"
    - listitem:
      - link "Discord(opens in new tab)":
        - /url: https://aka.ms/playwright/discord
        - text: Discord
        - img "(opens in new tab)"
    - listitem:
      - link "X(opens in new tab)":
        - /url: https://x.com/playwrightweb
        - text: X
        - img "(opens in new tab)"
    - listitem:
      - link "LinkedIn(opens in new tab)":
        - /url: https://www.linkedin.com/company/playwrightweb
        - text: LinkedIn
        - img "(opens in new tab)"
  - text: More
  - list:
    - listitem:
      - link "GitHub(opens in new tab)":
        - /url: https://github.com/microsoft/playwright
        - text: GitHub
        - img "(opens in new tab)"
    - listitem:
      - link "YouTube(opens in new tab)":
        - /url: https://www.youtube.com/channel/UC46Zj8pDH5tDosqm1gd7WTg
        - text: YouTube
        - img "(opens in new tab)"
    - listitem:
      - link "Blog(opens in new tab)":
        - /url: https://dev.to/playwright
        - text: Blog
        - img "(opens in new tab)"
    - listitem:
      - link "Ambassadors":
        - /url: /community/ambassadors
    - listitem:
      - link "Microsoft Privacy Statement(opens in new tab)":
        - /url: https://go.microsoft.com/fwlink/?LinkId=521839
        - text: Microsoft Privacy Statement
        - img "(opens in new tab)"
  - text: Copyright © 2026 Microsoft
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | 
  4  | test('has title', async ({ page }) => {
  5  |   await page.goto('https://playwright.dev/');
  6  |   // Expect a title "to contain" a substring.
  7  |   await expect(page).toHaveTitle(/Playwright/);
  8  | });
  9  | 
  10 | test('get started link', async ({ page }) => {
  11 |   await page.goto('https://playwright.dev/');
  12 |   // Click the get started link.
  13 |   await page.getByRole('link', { name: 'Get started' }).click();
  14 |   // Expects page to have a heading with the name of Installation.
  15 |   await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
  16 | });
  17 | 
  18 | 
  19 | // Homework
  20 | // Learn what is masking, and why we need to use masking in e2e tests, does it has some limitation's
  21 | // Learn about how to do correct snapshot testing, tell me where its useful or where its wrong.
  22 | 
  23 | test('homepage hero matches its visual snapshot', async ({ page }) => {
  24 |   await page.setViewportSize({ width: 1280, height: 720 });
  25 |   await page.goto('https://playwright.dev/docs/intro');
  26 | 
  27 |   await page.addStyleTag({ content: 'header.hero { background: crimson !important; }' });
  28 |   const hero = page.locator('header.hero');
> 29 |   await expect(hero.getByRole('heading', { level: 1 })).toBeVisible();
     |                                                         ^ Error: expect(locator).toBeVisible() failed
  30 | 
  31 |   // First run writes the baseline into tests/example.spec.ts-snapshots/.
  32 |   // Later runs compare against it and fail if the hero changes visually.
  33 |   // Re-record intentional changes with: npx playwright test --update-snapshots
  34 |   await expect(hero).toHaveScreenshot('homepage-hero.png', {
  35 |     maxDiffPixelRatio: 0.02,
  36 |   });
  37 | });
  38 | 
```