const express = require('express');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const SANDBOX_TIMEOUT = 30000; // 30 seconds
const MAX_OUTPUT_SIZE = 10000; // 10KB

class CodeInterpreter {
  constructor() {
    this.sessions = new Map();
  }

  async execute(code, language = 'python', files = []) {
    const sessionId = uuidv4();
    const workDir = `/tmp/interpreter-${sessionId}`;
    
    try {
      // Create workspace
      await fs.mkdir(workDir, { recursive: true });
      
      // Save uploaded files
      for (const file of files) {
        await fs.writeFile(path.join(workDir, file.name), file.content);
      }
      
      // Write code file
      const codeFile = language === 'python' ? 'script.py' : 'script.js';
      await fs.writeFile(path.join(workDir, codeFile), code);
      
      // Execute in Docker sandbox
      const result = await this.runInSandbox(workDir, language, codeFile);
      
      // Cleanup
      await fs.rm(workDir, { recursive: true, force: true });
      
      return result;
      
    } catch (error) {
      return { error: error.message };
    }
  }

  runInSandbox(workDir, language, codeFile) {
    return new Promise((resolve) => {
      const isPython = language === 'python';
      const image = isPython ? 'ai-devstudio-interpreter' : 'node:20-alpine';
      const cmd = isPython 
        ? `python ${codeFile}`
        : `node ${codeFile}`;
      
      const dockerCmd = `docker run --rm \
        --network none \
        --memory 512m \
        --cpus 1 \
        -v ${workDir}:/workspace \
        -w /workspace \
        ${image} \
        timeout 30 ${cmd} 2>&1`;
      
      exec(dockerCmd, { timeout: SANDBOX_TIMEOUT }, async (error, stdout, stderr) => {
        // Read generated files (plots, etc)
        const outputFiles = await this.collectOutputFiles(workDir);
        
        resolve({
          stdout: stdout.slice(0, MAX_OUTPUT_SIZE),
          stderr: stderr.slice(0, MAX_OUTPUT_SIZE),
          exitCode: error ? error.code : 0,
          files: outputFiles,
          success: !error
        });
      });
    });
  }

  async collectOutputFiles(workDir) {
    const files = [];
    const allowedExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.csv', '.json', '.txt', '.html'];
    
    try {
      const entries = await fs.readdir(workDir);
      
      for (const entry of entries) {
        const ext = path.extname(entry).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          const content = await fs.readFile(path.join(workDir, entry));
          files.push({
            name: entry,
            type: ext,
            data: content.toString('base64'),
            size: content.length
          });
        }
      }
    } catch (e) {
      // Ignore errors
    }
    
    return files;
  }
}

const interpreter = new CodeInterpreter();

// Execute code endpoint
app.post('/execute', async (req, res) => {
  try {
    const { code, language, files } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'No code provided' });
    }
    
    const result = await interpreter.execute(code, language, files);
    res.json(result);
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'code-interpreter' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🐍 Code Interpreter running on port ${PORT}`);
});
