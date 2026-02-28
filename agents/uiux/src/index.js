const express = require('express');
const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', agent: 'uiux-agent' });
});

// Generate wireframe
app.post('/wireframe', (req, res) => {
  const { title, type, pages } = req.body;
  
  const wireframe = {
    id: `wire-${Date.now()}`,
    title: title || 'Untitled',
    type: type || 'landing',
    pages: pages || ['Home'],
    sections: generateSections(type),
    createdAt: new Date().toISOString()
  };
  
  res.json({ success: true, wireframe });
});

function generateSections(type) {
  const sections = {
    landing: ['hero', 'features', 'testimonials', 'cta', 'footer'],
    dashboard: ['sidebar', 'header', 'stats', 'charts', 'table'],
    ecommerce: ['header', 'filters', 'product-grid', 'cart', 'footer']
  };
  return sections[type] || sections.landing;
}

// Generate design system
app.post('/design-system', (req, res) => {
  const { theme } = req.body;
  
  const designSystem = {
    colors: {
      primary: theme === 'blue' ? '#3B82F6' : '#10B981',
      secondary: '#6B7280',
      background: '#FFFFFF',
      text: '#1F2937'
    },
    typography: {
      heading: 'Inter, sans-serif',
      body: 'Inter, sans-serif',
      baseSize: '16px'
    },
    spacing: {
      unit: '8px',
      scale: [0, 1, 2, 4, 8, 16, 32]
    }
  };
  
  res.json({ success: true, designSystem });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎨 UI/UX Agent running on port ${PORT}`);
});
