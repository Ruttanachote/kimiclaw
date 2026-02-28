// Website Clone Agent
// AI ไปดูเว็บ → วิเคราะห์ → Clone UI มาให้

const axios = require('axios');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

class WebsiteCloneAgent {
  constructor(aiProxy) {
    this.aiProxy = aiProxy;
    this.clones = new Map();
  }

  // Main: Clone website from URL
  async cloneWebsite(url, options = {}) {
    const cloneId = `clone-${uuidv4().slice(0, 8)}`;
    
    console.log(`🌐 Starting clone: ${url}`);
    
    try {
      // Step 1: Fetch website
      const html = await this.fetchWebsite(url);
      
      // Step 2: Parse structure
      const structure = await this.parseStructure(html, url);
      
      // Step 3: Extract styles
      const styles = await this.extractStyles(html, url);
      
      // Step 4: Analyze with AI
      const analysis = await this.analyzeWithAI(structure, styles);
      
      // Step 5: Generate clone
      const clone = await this.generateClone(analysis, options);
      
      // Step 6: Save result
      this.clones.set(cloneId, {
        id: cloneId,
        originalUrl: url,
        structure,
        styles,
        analysis,
        clone,
        createdAt: new Date().toISOString()
      });
      
      return {
        success: true,
        cloneId,
        originalUrl: url,
        clone,
        preview: this.generatePreview(clone),
        export: {
          vue: this.exportToVue(clone),
          react: this.exportToReact(clone),
          html: this.exportToHTML(clone),
          css: this.exportToCSS(clone)
        }
      };
      
    } catch (err) {
      console.error('Clone failed:', err);
      throw new Error(`Failed to clone ${url}: ${err.message}`);
    }
  }

  // Step 1: Fetch website content
  async fetchWebsite(url) {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxRedirects: 5
      });
      
      return response.data;
    } catch (err) {
      throw new Error(`Cannot fetch website: ${err.message}`);
    }
  }

  // Step 2: Parse HTML structure
  async parseStructure(html, baseUrl) {
    const $ = cheerio.load(html);
    
    // Remove scripts and styles for cleaner analysis
    $('script, style, noscript').remove();
    
    const structure = {
      title: $('title').text() || 'Untitled',
      description: $('meta[name="description"]').attr('content') || '',
      pages: [],
      sections: [],
      components: []
    };

    // Detect page type
    structure.pageType = this.detectPageType($);
    
    // Extract sections
    const sectionSelectors = [
      'header', 'nav', 'main', 'section', 'article',
      'aside', 'footer', 'hero', '[class*="hero"]',
      '[class*="header"]', '[class*="footer"]',
      '[class*="section"]', '[id*="section"]'
    ];
    
    $(sectionSelectors.join(', ')).each((i, el) => {
      const $el = $(el);
      const section = {
        id: $el.attr('id') || `section-${i}`,
        tag: el.tagName,
        className: $el.attr('class') || '',
        text: $el.text().slice(0, 200),
        children: $el.children().length,
        hasImages: $el.find('img').length > 0,
        hasForms: $el.find('form, input, button').length > 0
      };
      structure.sections.push(section);
    });

    // Extract navigation
    const nav = $('nav, [class*="nav"], [class*="menu"]');
    if (nav.length) {
      structure.navigation = {
        items: nav.find('a').map((i, el) => ({
          text: $(el).text().trim(),
          href: $(el).attr('href')
        })).get().slice(0, 10)
      };
    }

    // Extract colors from inline styles
    const colors = new Set();
    $('[style*="color"], [style*="background"]').each((i, el) => {
      const style = $(el).attr('style');
      const matches = style.match(/#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3}|rgb[a]?\([^)]+\)/g);
      if (matches) {
        matches.forEach(c => colors.add(c));
      }
    });
    structure.colors = Array.from(colors).slice(0, 10);

    // Extract fonts
    const fonts = new Set();
    $('[style*="font"]').each((i, el) => {
      const style = $(el).attr('style');
      const match = style.match(/font-family:\s*([^;]+)/);
      if (match) {
        match[1].split(',').forEach(f => fonts.add(f.trim().replace(/["']/g, '')));
      }
    });
    structure.fonts = Array.from(fonts).slice(0, 5);

    return structure;
  }

  // Detect page type
  detectPageType($) {
    const hasEcommerce = $('.product, [class*="product"], [class*="shop"], [class*="cart"]').length > 0;
    const hasDashboard = $('.dashboard, [class*="dashboard"], [class*="chart"], [class*="stats"]').length > 0;
    const hasLanding = $('hero, [class*="hero"], [class*="landing"]').length > 0;
    const hasBlog = $('article, [class*="blog"], [class*="post"]').length > 3;
    
    if (hasEcommerce) return 'e-commerce';
    if (hasDashboard) return 'dashboard';
    if (hasLanding) return 'landing';
    if (hasBlog) return 'blog';
    return 'general';
  }

  // Step 3: Extract styles
  async extractStyles(html, baseUrl) {
    const $ = cheerio.load(html);
    
    const styles = {
      colors: {
        primary: null,
        secondary: null,
        background: null,
        text: null,
        accent: null
      },
      typography: {
        headingFont: null,
        bodyFont: null,
        baseSize: null
      },
      layout: {
        maxWidth: null,
        grid: null,
        spacing: null
      },
      components: []
    };

    // Try to find CSS files
    const cssUrls = [];
    $('link[rel="stylesheet"]').each((i, el) => {
      let href = $(el).attr('href');
      if (href) {
        if (href.startsWith('//')) href = 'https:' + href;
        else if (href.startsWith('/')) href = new URL(href, baseUrl).href;
        cssUrls.push(href);
      }
    });

    // Fetch and parse CSS (simplified)
    for (const cssUrl of cssUrls.slice(0, 3)) {
      try {
        const cssResponse = await axios.get(cssUrl, { timeout: 10000 });
        const css = cssResponse.data;
        
        // Extract color variables
        const colorVars = css.match(/--[\w-]+:\s*#[a-fA-F0-9]{6}/g);
        if (colorVars) {
          colorVars.forEach(v => {
            const [name, value] = v.split(':');
            if (name.includes('primary')) styles.colors.primary = value.trim();
            if (name.includes('secondary')) styles.colors.secondary = value.trim();
            if (name.includes('background')) styles.colors.background = value.trim();
          });
        }
      } catch (err) {
        // Ignore CSS fetch errors
      }
    }

    return styles;
  }

  // Step 4: Analyze with AI
  async analyzeWithAI(structure, styles) {
    const prompt = `
Analyze this website structure and create a detailed design specification.

Page Type: ${structure.pageType}
Title: ${structure.title}
Description: ${structure.description}

Sections Found:
${structure.sections.map(s => `- ${s.tag}${s.className ? '.' + s.className.split(' ')[0] : ''}: ${s.text.slice(0, 50)}...`).join('\n')}

Navigation Items:
${structure.navigation?.items.map(i => `- ${i.text}`).join('\n') || 'None'}

Colors Detected:
${structure.colors.join(', ')}

Fonts Detected:
${structure.fonts.join(', ')}

Create a detailed specification including:
1. Layout structure (header, main sections, footer)
2. Color palette (primary, secondary, background, text, accent)
3. Typography (heading font, body font, sizes)
4. Component list (buttons, cards, forms, etc.)
5. Responsive breakpoints
6. Animations/interactions

Return as JSON.`;

    const response = await this.aiProxy.generate({
      model: 'claude-3-5-sonnet',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return this.createDefaultAnalysis(structure);
    }
  }

  createDefaultAnalysis(structure) {
    return {
      layout: {
        type: structure.pageType,
        header: true,
        hero: structure.pageType === 'landing',
        mainSections: structure.sections.length,
        footer: true
      },
      colors: {
        primary: structure.colors[0] || '#3B82F6',
        secondary: structure.colors[1] || '#10B981',
        background: '#FFFFFF',
        text: '#1F2937',
        accent: structure.colors[2] || '#F59E0B'
      },
      typography: {
        headingFont: structure.fonts[0] || 'Inter',
        bodyFont: structure.fonts[1] || 'Inter',
        baseSize: '16px'
      },
      components: ['Button', 'Card', 'Input', 'Navigation']
    };
  }

  // Step 5: Generate clone
  async generateClone(analysis, options) {
    const { framework = 'vue', style = 'tailwind' } = options;
    
    return {
      framework,
      style,
      layout: analysis.layout,
      colors: analysis.colors,
      typography: analysis.typography,
      components: analysis.components,
      pages: this.generatePages(analysis),
      assets: {
        needsImages: true,
        placeholderService: 'https://via.placeholder.com'
      }
    };
  }

  generatePages(analysis) {
    const pages = [];
    
    // Always have home
    pages.push({
      name: 'Home',
      route: '/',
      sections: [
        { name: 'Header', type: 'navigation' },
        ...(analysis.layout.hero ? [{ name: 'Hero', type: 'hero' }] : []),
        { name: 'Main Content', type: 'content' },
        { name: 'Footer', type: 'footer' }
      ]
    });

    // Add other pages based on navigation
    if (analysis.navigation?.items) {
      analysis.navigation.items.forEach(item => {
        const name = item.text;
        if (!pages.find(p => p.name === name)) {
          pages.push({
            name,
            route: `/${name.toLowerCase().replace(/\s+/g, '-')}`,
            sections: [
              { name: 'Header', type: 'navigation' },
              { name: 'Content', type: 'content' },
              { name: 'Footer', type: 'footer' }
            ]
          });
        }
      });
    }

    return pages;
  }

  // Generate preview HTML
  generatePreview(clone) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Clone Preview - ${clone.layout.type}</title>
  <style>
    :root {
      --primary: ${clone.colors.primary};
      --secondary: ${clone.colors.secondary};
      --background: ${clone.colors.background};
      --text: ${clone.colors.text};
    }
    body {
      font-family: ${clone.typography.bodyFont}, sans-serif;
      background: var(--background);
      color: var(--text);
      margin: 0;
    }
    .preview-header {
      background: var(--primary);
      color: white;
      padding: 1rem;
      text-align: center;
    }
    .preview-section {
      padding: 2rem;
      border-bottom: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="preview-header">
    <h1>🎨 Clone Preview: ${clone.layout.type}</h1>
    <p>Framework: ${clone.framework} | Style: ${clone.style}</p>
  </div>
  ${clone.pages.map(p => `
    <div class="preview-section">
      <h2>📄 ${p.name}</h2>
      <p>Route: ${p.route}</p>
      <p>Sections: ${p.sections.map(s => s.name).join(', ')}</p>
    </div>
  `).join('')}
  <div class="preview-section">
    <h2>🎨 Colors</h2>
    <div style="display: flex; gap: 1rem;">
      ${Object.entries(clone.colors).map(([name, color]) => `
        <div style="background: ${color}; padding: 1rem; border-radius: 8px;">
          ${name}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>`;
  }

  // Export to Vue
  exportToVue(clone) {
    return {
      framework: 'vue3',
      files: clone.pages.map(page => ({
        path: `src/views/${page.name}.vue`,
        content: this.generateVueComponent(page, clone)
      }))
    };
  }

  generateVueComponent(page, clone) {
    return `<template>
  <div class="${page.name.toLowerCase()}-page">
    ${page.sections.map(s => `
    <${s.type === 'navigation' ? 'AppHeader' : s.type === 'footer' ? 'AppFooter' : 'section'} 
      ${s.type === 'content' ? `class="${s.name.toLowerCase().replace(/\s+/g, '-')}"` : ''}
    />
    `).join('\n    ')}
  </div>
</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
</script>

<style scoped>
.${page.name.toLowerCase()}-page {
  min-height: 100vh;
}
</style>`;
  }

  // Export to React
  exportToReact(clone) {
    return {
      framework: 'react',
      files: clone.pages.map(page => ({
        path: `src/pages/${page.name}.jsx`,
        content: this.generateReactComponent(page, clone)
      }))
    };
  }

  generateReactComponent(page, clone) {
    return `import React from 'react';
import { AppHeader } from '@/components/AppHeader';
import { AppFooter } from '@/components/AppFooter';

export default function ${page.name}Page() {
  return (
    <div className="${page.name.toLowerCase()}-page">
      ${page.sections.map(s => `
      ${s.type === 'navigation' ? '<AppHeader />' : s.type === 'footer' ? '<AppFooter />' : `<section className="${s.name.toLowerCase().replace(/\s+/g, '-')}" />`}`
      ).join('\n      ')}
    </div>
  );
}`;
  }

  // Export to HTML
  exportToHTML(clone) {
    return clone.pages.map(page => ({
      filename: `${page.name.toLowerCase()}.html`,
      content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.name}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>Header</header>
  <main>Main Content</main>
  <footer>Footer</footer>
</body>
</html>`
    }));
  }

  // Export to CSS
  exportToCSS(clone) {
    return `:root {
  --color-primary: ${clone.colors.primary};
  --color-secondary: ${clone.colors.secondary};
  --color-background: ${clone.colors.background};
  --color-text: ${clone.colors.text};
  --color-accent: ${clone.colors.accent};
  
  --font-heading: ${clone.typography.headingFont}, sans-serif;
  --font-body: ${clone.typography.bodyFont}, sans-serif;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--font-body);
  background-color: var(--color-background);
  color: var(--color-text);
  line-height: 1.6;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
}`;
  }

  // Get clone by ID
  getClone(cloneId) {
    return this.clones.get(cloneId);
  }

  // List all clones
  listClones() {
    return Array.from(this.clones.values()).map(c => ({
      id: c.id,
      originalUrl: c.originalUrl,
      pageType: c.analysis.layout?.type || 'unknown',
      createdAt: c.createdAt
    }));
  }
}

module.exports = WebsiteCloneAgent;
