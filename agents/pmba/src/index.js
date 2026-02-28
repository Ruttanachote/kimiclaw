const express = require('express');
const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', agent: 'pmba-agent' });
});

// Create project plan
app.post('/plan', (req, res) => {
  const { name, description, duration } = req.body;
  
  const plan = {
    name,
    description,
    duration: duration || '2 weeks',
    phases: [
      { name: 'Discovery', duration: '2 days', tasks: ['Research', 'Requirements'] },
      { name: 'Design', duration: '3 days', tasks: ['Wireframes', 'UI Design'] },
      { name: 'Development', duration: '5 days', tasks: ['Frontend', 'Backend'] },
      { name: 'Testing', duration: '2 days', tasks: ['QA', 'Bug fixes'] },
      { name: 'Deployment', duration: '2 days', tasks: ['Deploy', 'Documentation'] }
    ],
    milestones: [
      { name: 'Design Approval', day: 5 },
      { name: 'Beta Release', day: 12 },
      { name: 'Production', day: 14 }
    ]
  };
  
  res.json({ success: true, plan });
});

// Generate report
app.post('/report', (req, res) => {
  const { type, data } = req.body;
  
  const report = {
    type,
    generatedAt: new Date().toISOString(),
    summary: `รายงาน${type}สำหรับโปรเจก`,
    data
  };
  
  res.json({ success: true, report });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📊 PM/BA Agent running on port ${PORT}`);
});
