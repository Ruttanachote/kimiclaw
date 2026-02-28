// Visual Testing Agent
// AI ที่เทสเว็บให้เอง ดู preview หลายอุปกรณ์ วิเคราะห์ responsive

const { chromium, firefox, webkit } = require('playwright');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

class VisualTestingAgent {
  constructor(aiProxy) {
    this.aiProxy = aiProxy;
    this.browsers = {};
    this.activeTests = new Map();
  }

  // Main: Test website with multiple devices
  async testWebsite(url, options = {}) {
    const testId = `test-${uuidv4().slice(0, 8)}`;
    
    const testConfig = {
      id: testId,
      url,
      devices: options.devices || ['desktop', 'tablet', 'mobile'],
      tests: options.tests || ['visual', 'responsive', 'accessibility', 'performance'],
      aiAnalysis: options.aiAnalysis !== false,
      recordVideo: options.recordVideo || false
    };

    console.log(`🧪 Starting visual test: ${url}`);
    
    this.activeTests.set(testId, {
      ...testConfig,
      status: 'running',
      progress: 0,
      results: {},
      startedAt: new Date().toISOString()
    });

    try {
      // Launch browsers
      await this.launchBrowsers();

      // Run tests for each device
      const deviceResults = {};
      
      for (const device of testConfig.devices) {
        console.log(`  📱 Testing ${device}...`);
        
        deviceResults[device] = await this.testDevice(url, device, testConfig);
        
        this.updateProgress(testId, 
          (Object.keys(deviceResults).length / testConfig.devices.length) * 100
        );
      }

      // AI Analysis
      let aiAnalysis = null;
      if (testConfig.aiAnalysis) {
        console.log(`  🤖 AI analyzing...`);
        aiAnalysis = await this.analyzeWithAI(deviceResults, url);
      }

      // Generate test report
      const report = this.generateReport(testId, deviceResults, aiAnalysis);

      // Save results
      this.activeTests.set(testId, {
        ...this.activeTests.get(testId),
        status: 'completed',
        progress: 100,
        results: report,
        completedAt: new Date().toISOString()
      });

      return {
        success: true,
        testId,
        url,
        report,
        screenshots: this.getScreenshots(testId),
        video: testConfig.recordVideo ? this.getVideoPath(testId) : null
      };

    } catch (err) {
      this.activeTests.set(testId, {
        ...this.activeTests.get(testId),
        status: 'failed',
        error: err.message
      });
      
      throw err;
    } finally {
      await this.closeBrowsers();
    }
  }

  // Launch browsers for testing
  async launchBrowsers() {
    this.browsers.chromium = await chromium.launch();
    this.browsers.firefox = await firefox.launch();
    this.browsers.webkit = await webkit.launch();
  }

  async closeBrowsers() {
    for (const browser of Object.values(this.browsers)) {
      await browser.close();
    }
    this.browsers = {};
  }

  // Test specific device
  async testDevice(url, deviceType, config) {
    const viewport = this.getViewport(deviceType);
    const browser = this.browsers.chromium;
    
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: deviceType === 'mobile' ? 2 : 1,
      userAgent: this.getUserAgent(deviceType),
      recordVideo: config.recordVideo ? {
        dir: `./videos/${config.id}/`,
        size: viewport
      } : undefined
    });

    const page = await context.newPage();
    
    // Collect metrics
    const metrics = {
      loadTime: 0,
      domContentLoaded: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      errors: [],
      consoleLogs: []
    };

    // Listen for console logs and errors
    page.on('console', msg => {
      metrics.consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });

    page.on('pageerror', err => {
      metrics.errors.push({
        message: err.message,
        stack: err.stack,
        timestamp: Date.now()
      });
    });

    // Navigate and measure
    const startTime = Date.now();
    
    try {
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      metrics.loadTime = Date.now() - startTime;
      metrics.statusCode = response.status();

      // Wait for LCP
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            resolve(entries[entries.length - 1]?.startTime || 0);
          });
          observer.observe({ entryTypes: ['largest-contentful-paint'] });
          setTimeout(() => resolve(0), 5000);
        });
      });
      
      metrics.largestContentfulPaint = lcp;

      // Get CLS
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
          });
          observer.observe({ entryTypes: ['layout-shift'] });
          setTimeout(() => resolve(clsValue), 5000);
        });
      });
      
      metrics.cumulativeLayoutShift = cls;

      // Run accessibility check
      const accessibility = await this.checkAccessibility(page);

      // Run responsive checks
      const responsive = await this.checkResponsive(page, deviceType);

      // Take screenshots
      const screenshots = await this.takeScreenshots(page, config.id, deviceType);

      // Test interactions
      const interactions = await this.testInteractions(page);

      await context.close();

      return {
        device: deviceType,
        viewport,
        metrics,
        accessibility,
        responsive,
        screenshots,
        interactions,
        passed: this.determinePass(metrics, accessibility, responsive)
      };

    } catch (err) {
      await context.close();
      throw err;
    }
  }

  // Viewport configurations
  getViewport(deviceType) {
    const viewports = {
      desktop: { width: 1920, height: 1080 },
      laptop: { width: 1440, height: 900 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 812 },
      'mobile-lg': { width: 414, height: 896 }
    };
    
    return viewports[deviceType] || viewports.desktop;
  }

  getUserAgent(deviceType) {
    const agents = {
      desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      tablet: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    };
    
    return agents[deviceType] || agents.desktop;
  }

  // Accessibility check
  async checkAccessibility(page) {
    // Inject axe-core or similar
    const results = await page.evaluate(() => {
      // Simplified accessibility checks
      const checks = {
        imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
        missingLabels: document.querySelectorAll('input:not([id]), select:not([id])').length,
        lowContrastElements: 0, // Would need color contrast calculation
        missingFocusIndicators: 0,
        totalElements: document.querySelectorAll('*').length
      };
      
      // Check for focus indicators
      const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
      interactiveElements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.outlineStyle === 'none' && !style.boxShadow) {
          checks.missingFocusIndicators++;
        }
      });
      
      return checks;
    });

    const score = Math.max(0, 100 - (
      results.imagesWithoutAlt * 5 +
      results.missingLabels * 3 +
      results.missingFocusIndicators * 2
    ));

    return {
      score,
      issues: results,
      passed: score >= 80
    };
  }

  // Responsive check
  async checkResponsive(page, deviceType) {
    const checks = await page.evaluate(() => {
      return {
        // Check for horizontal scroll
        hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
        
        // Check for viewport meta tag
        hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
        
        // Check for media queries usage
        mediaQueries: Array.from(document.styleSheets)
          .flatMap(sheet => {
            try {
              return Array.from(sheet.cssRules)
                .filter(rule => rule.type === CSSRule.MEDIA_RULE)
                .map(rule => rule.conditionText);
            } catch {
              return [];
            }
          }),
        
        // Check for fixed widths that might break
        fixedWidthElements: Array.from(document.querySelectorAll('*'))
          .filter(el => {
            const style = window.getComputedStyle(el);
            return style.width.includes('px') && parseInt(style.width) > window.innerWidth;
          }).length,
        
        // Check text readability
        smallText: Array.from(document.querySelectorAll('p, span, a'))
          .filter(el => {
            const size = parseInt(window.getComputedStyle(el).fontSize);
            return size < 12;
          }).length
      };
    });

    const issues = [];
    if (checks.hasHorizontalScroll) issues.push('Horizontal scroll detected');
    if (!checks.hasViewportMeta) issues.push('Missing viewport meta tag');
    if (checks.fixedWidthElements > 0) issues.push(`${checks.fixedWidthElements} elements with fixed width`);
    if (checks.smallText > 5) issues.push('Text may be too small on mobile');

    return {
      passed: issues.length === 0,
      checks,
      issues,
      mediaQueries: checks.mediaQueries.length
    };
  }

  // Test user interactions
  async testInteractions(page) {
    const results = [];
    
    // Test navigation
    const navLinks = await page.locator('nav a, header a').all();
    for (const link of navLinks.slice(0, 3)) {
      try {
        const isVisible = await link.isVisible();
        const isClickable = await link.isEnabled();
        results.push({
          element: 'nav-link',
          test: 'visibility',
          passed: isVisible && isClickable
        });
      } catch {
        results.push({ element: 'nav-link', test: 'visibility', passed: false });
      }
    }

    // Test buttons
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 3)) {
      try {
        const isClickable = await button.isEnabled();
        results.push({ element: 'button', test: 'clickable', passed: isClickable });
      } catch {
        results.push({ element: 'button', test: 'clickable', passed: false });
      }
    }

    // Test forms
    const inputs = await page.locator('input, textarea').all();
    results.push({
      element: 'form-inputs',
      test: 'count',
      value: inputs.length,
      passed: inputs.length > 0
    });

    return results;
  }

  // Take screenshots
  async takeScreenshots(page, testId, deviceType) {
    const timestamp = Date.now();
    const basePath = `./screenshots/${testId}/${deviceType}`;
    
    // Ensure directory exists
    const fs = require('fs').promises;
    await fs.mkdir(basePath, { recursive: true });
    
    const screenshots = {
      fullPage: `${basePath}/fullpage-${timestamp}.png`,
      viewport: `${basePath}/viewport-${timestamp}.png`,
      elements: []
    };

    // Full page screenshot
    await page.screenshot({ 
      path: screenshots.fullPage,
      fullPage: true 
    });

    // Viewport screenshot
    await page.screenshot({ 
      path: screenshots.viewport,
      fullPage: false 
    });

    // Screenshot key elements
    const elements = ['header', 'main', 'footer', 'nav', '[class*="hero"]'];
    for (const selector of elements) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible()) {
          const path = `${basePath}/element-${selector.replace(/[^a-z]/g, '')}-${timestamp}.png`;
          await element.screenshot({ path });
          screenshots.elements.push({ selector, path });
        }
      } catch {
        // Element not found or not visible
      }
    }

    return screenshots;
  }

  // AI Analysis
  async analyzeWithAI(deviceResults, url) {
    const prompt = `
Analyze these visual test results for ${url}:

${Object.entries(deviceResults).map(([device, result]) => `
## ${device.toUpperCase()}
- Load Time: ${result.metrics.loadTime}ms
- LCP: ${result.metrics.largestContentfulPaint}ms
- CLS: ${result.metrics.cumulativeLayoutShift}
- Accessibility Score: ${result.accessibility.score}/100
- Responsive: ${result.responsive.passed ? 'PASS' : 'FAIL'}
- Issues: ${result.responsive.issues.join(', ') || 'None'}
`).join('\n')}

Provide:
1. Overall assessment (excellent/good/needs work/critical)
2. Critical issues found
3. Recommendations for improvement
4. Priority fixes

Return as JSON.`;

    try {
      const response = await this.aiProxy.generate({
        model: 'claude-3-5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      });

      return JSON.parse(response.content);
    } catch {
      return {
        assessment: 'unknown',
        criticalIssues: [],
        recommendations: [],
        priorityFixes: []
      };
    }
  }

  // Generate test report
  generateReport(testId, deviceResults, aiAnalysis) {
    const devices = Object.keys(deviceResults);
    
    return {
      summary: {
        totalDevices: devices.length,
        passed: devices.filter(d => deviceResults[d].passed).length,
        failed: devices.filter(d => !deviceResults[d].passed).length,
        overallScore: this.calculateOverallScore(deviceResults),
        assessment: aiAnalysis?.assessment || 'unknown'
      },
      devices: deviceResults,
      aiAnalysis,
      recommendations: this.generateRecommendations(deviceResults, aiAnalysis)
    };
  }

  calculateOverallScore(deviceResults) {
    const scores = Object.values(deviceResults).map(r => {
      const metricScore = Math.min(100, Math.max(0, 
        100 - (r.metrics.loadTime / 100)
      ));
      const accessibilityScore = r.accessibility.score;
      const responsiveScore = r.responsive.passed ? 100 : 50;
      
      return (metricScore + accessibilityScore + responsiveScore) / 3;
    });
    
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  generateRecommendations(deviceResults, aiAnalysis) {
    const recommendations = [];
    
    // Performance recommendations
    const slowDevices = Object.entries(deviceResults)
      .filter(([_, r]) => r.metrics.loadTime > 3000);
    
    if (slowDevices.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'performance',
        issue: 'Slow load time',
        devices: slowDevices.map(([d]) => d),
        suggestion: 'Optimize images, enable compression, use CDN'
      });
    }

    // Accessibility recommendations
    const lowAccessibility = Object.entries(deviceResults)
      .filter(([_, r]) => r.accessibility.score < 80);
    
    if (lowAccessibility.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'accessibility',
        issue: 'Low accessibility score',
        devices: lowAccessibility.map(([d]) => d),
        suggestion: 'Add alt text to images, ensure proper contrast, add ARIA labels'
      });
    }

    // Responsive recommendations
    const nonResponsive = Object.entries(deviceResults)
      .filter(([_, r]) => !r.responsive.passed);
    
    if (nonResponsive.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'responsive',
        issue: 'Responsive issues',
        devices: nonResponsive.map(([d]) => d),
        suggestion: 'Fix horizontal scroll, use relative units, add viewport meta tag'
      });
    }

    // Add AI recommendations
    if (aiAnalysis?.recommendations) {
      recommendations.push(...aiAnalysis.recommendations.map(r => ({
        priority: 'medium',
        category: 'ai-suggested',
        ...r
      })));
    }

    return recommendations;
  }

  determinePass(metrics, accessibility, responsive) {
    return metrics.loadTime < 5000 &&
           accessibility.score >= 70 &&
           responsive.passed;
  }

  updateProgress(testId, progress) {
    const test = this.activeTests.get(testId);
    if (test) {
      test.progress = Math.round(progress);
    }
  }

  getScreenshots(testId) {
    const test = this.activeTests.get(testId);
    if (!test?.results?.devices) return [];
    
    return Object.values(test.results.devices)
      .flatMap(d => [
        d.screenshots.fullPage,
        d.screenshots.viewport,
        ...d.screenshots.elements.map(e => e.path)
      ]);
  }

  getVideoPath(testId) {
    return `./videos/${testId}/`;
  }

  getTestStatus(testId) {
    return this.activeTests.get(testId);
  }

  getAllTests() {
    return Array.from(this.activeTests.entries()).map(([id, test]) => ({
      id,
      url: test.url,
      status: test.status,
      progress: test.progress,
      startedAt: test.startedAt,
      completedAt: test.completedAt
    }));
  }
}

module.exports = VisualTestingAgent;
