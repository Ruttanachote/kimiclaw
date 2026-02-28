const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', agent: 'frontend-agent' });
});

// Generate Vue component
app.post('/generate', async (req, res) => {
  const { name, type, props } = req.body;
  
  try {
    const component = generateVueComponent(name, type, props);
    
    res.json({ 
      success: true, 
      component: {
        name,
        filename: `${name}.vue`,
        content: component
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function generateVueComponent(name, type, props = []) {
  const propsDef = props.map(p => `${p}: { type: String, required: true }`).join(',\n    ');
  
  return `<template>
  <div class="${name.toLowerCase()}">
    <!-- ${type} component -->
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  ${propsDef}
});
</script>

<style scoped>
.${name.toLowerCase()} {
  /* Component styles */
}
</style>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`⚛️ Frontend Agent running on port ${PORT}`);
});
