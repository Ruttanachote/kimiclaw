const express = require('express');
const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', agent: 'backend-agent' });
});

// Generate API endpoint
app.post('/generate-api', (req, res) => {
  const { resource, methods } = req.body;
  
  const endpoints = methods.map(method => {
    return {
      method: method.toUpperCase(),
      path: `/api/${resource}`,
      handler: generateHandler(resource, method)
    };
  });
  
  res.json({ success: true, endpoints });
});

function generateHandler(resource, method) {
  const handlers = {
    get: `async (req, res) => {
  const ${resource} = await db.${resource}.findAll();
  res.json(${resource});
}`,
    post: `async (req, res) => {
  const ${resource} = await db.${resource}.create(req.body);
  res.status(201).json(${resource});
}`,
    put: `async (req, res) => {
  const ${resource} = await db.${resource}.update(req.params.id, req.body);
  res.json(${resource});
}`,
    delete: `async (req, res) => {
  await db.${resource}.delete(req.params.id);
  res.status(204).send();
}`
  };
  
  return handlers[method] || handlers.get;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🔧 Backend Agent running on port ${PORT}`);
});
