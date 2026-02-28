// Input Validation Middleware
// ตรวจสอบทุก input ที่เข้ามา

const { body, param, query, validationResult } = require('express-validator');

// Custom validation rules
const validators = {
  // Project validators
  createProject: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Project name must be 1-100 characters')
      .matches(/^[a-zA-Z0-9\s\-_]+$/)
      .withMessage('Project name can only contain letters, numbers, spaces, hyphens, and underscores')
      .escape(),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters')
      .escape(),
    
    body('type')
      .optional()
      .isIn(['web-app', 'mobile-app', 'e-commerce', 'landing-page', 'dashboard', 'api'])
      .withMessage('Invalid project type')
  ],

  // Agent validators
  createAgent: [
    body('name')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Agent name must be 3-50 characters')
      .matches(/^[a-z0-9\-]+$/)
      .withMessage('Agent name can only contain lowercase letters, numbers, and hyphens')
      .escape(),
    
    body('type')
      .isIn(['research', 'uiux', 'frontend', 'backend', 'qa', 'pmba', 'supervisor', 'secretary', 'custom'])
      .withMessage('Invalid agent type'),
    
    body('modelProvider')
      .isIn(['anthropic', 'openai', 'google', 'moonshot', 'deepseek', 'openrouter', 'ollama', 'local'])
      .withMessage('Invalid model provider'),
    
    body('maxTokens')
      .optional()
      .isInt({ min: 100, max: 100000 })
      .withMessage('maxTokens must be between 100 and 100000'),
    
    body('temperature')
      .optional()
      .isFloat({ min: 0, max: 2 })
      .withMessage('temperature must be between 0 and 2')
  ],

  // Wireframe validators
  generateWireframe: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Title must be 1-100 characters')
      .escape(),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters')
      .escape(),
    
    body('type')
      .isIn(['landing', 'dashboard', 'ecommerce', 'form'])
      .withMessage('Invalid wireframe type'),
    
    body('pages')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Maximum 10 pages allowed')
      .custom((pages) => {
        const validPages = ['Home', 'About', 'Contact', 'Dashboard', 'Login', 'Register', 'Profile', 'Settings'];
        return pages.every(p => validPages.includes(p) || typeof p === 'string' && p.length <= 50);
      })
      .withMessage('Invalid page names')
  ],

  // Design system validators
  generateDesignSystem: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be 1-100 characters')
      .escape(),
    
    body('theme')
      .optional()
      .isIn(['blue', 'emerald', 'violet', 'rose', 'orange', 'slate'])
      .withMessage('Invalid theme')
  ],

  // Message validators
  sendMessage: [
    body('message')
      .trim()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Message must be 1-10000 characters')
      .escape(),
    
    body('agentName')
      .optional()
      .matches(/^[a-z0-9\-]+$/)
      .withMessage('Invalid agent name')
  ],

  // ID validators
  projectId: [
    param('id')
      .matches(/^proj-[a-zA-Z0-9]+$/)
      .withMessage('Invalid project ID format')
  ],

  agentId: [
    param('id')
      .matches(/^[a-z0-9\-]+$/)
      .withMessage('Invalid agent ID format')
  ],

  // Query validators
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Page must be between 1 and 1000')
      .toInt(),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt()
  ],

  // File upload validators
  fileUpload: [
    body('filename')
      .optional()
      .matches(/^[a-zA-Z0-9\-_\.]+$/)
      .withMessage('Invalid filename')
      .isLength({ max: 255 }),
    
    body('fileType')
      .optional()
      .isIn(['image', 'document', 'code', 'data'])
      .withMessage('Invalid file type')
  ]
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Input validation failed',
        details: errors.array().map(err => ({
          field: err.path,
          message: err.msg,
          value: err.value
        }))
      }
    });
  }
  
  next();
};

// Sanitize object recursively
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Remove keys that start with $ (NoSQL injection protection)
    if (key.startsWith('$')) continue;
    
    sanitized[key] = sanitizeObject(value);
  }
  
  return sanitized;
};

// SQL injection check
const sqlInjectionCheck = (req, res, next) => {
  const sqlPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)|(--)|(\/\*)|(\*\/)/i;
  
  const checkValue = (value, path) => {
    if (typeof value === 'string' && sqlPattern.test(value)) {
      throw new Error(`Potential SQL injection detected at ${path}`);
    }
    if (typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value)) {
        checkValue(v, `${path}.${k}`);
      }
    }
  };
  
  try {
    checkValue(req.body, 'body');
    checkValue(req.query, 'query');
    checkValue(req.params, 'params');
    next();
  } catch (err) {
    res.status(400).json({
      success: false,
      error: {
        code: 'SECURITY_VIOLATION',
        message: 'Invalid input detected'
      }
    });
  }
};

module.exports = {
  validators,
  handleValidationErrors,
  sanitizeObject,
  sqlInjectionCheck
};
