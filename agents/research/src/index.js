const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', agent: 'research-agent' });
});

// Search web
app.post('/search', async (req, res) => {
  const { query, limit } = req.body;
  
  try {
    // Mock search results
    const results = [
      {
        title: `Results for: ${query}`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        snippet: 'This is a sample search result...'
      }
    ];
    
    res.json({ 
      success: true, 
      query,
      results: results.slice(0, limit || 5)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Analyze competitor
app.post('/analyze', (req, res) => {
  const { url } = req.body;
  
  const analysis = {
    url,
    analyzedAt: new Date().toISOString(),
    findings: {
      design: 'Modern, clean layout',
      features: ['E-commerce', 'User login', 'Payment'],
      techStack: ['React', 'Node.js', 'PostgreSQL']
    },
    recommendations: [
      'Improve mobile responsiveness',
      'Add dark mode',
      'Optimize images'
    ]
  };
  
  res.json({ success: true, analysis });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔍 Research Agent running on port ${PORT}`);
});
