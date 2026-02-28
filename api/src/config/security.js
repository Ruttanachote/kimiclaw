// Security Configuration - No Default Secrets
// บังคับใช้ Environment Variables ไม่มี fallback

const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'DB_PASSWORD',
  'REDIS_PASSWORD'
];

const OPTIONAL_ENV_VARS = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_API_KEY',
  'STRIPE_SECRET_KEY',
  'N8N_API_KEY'
];

class SecurityConfig {
  constructor() {
    this.validateRequired();
    this.secrets = this.loadSecrets();
  }

  validateRequired() {
    const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:');
      missing.forEach(key => console.error(`   - ${key}`));
      console.error('\nPlease set these variables in your .env file');
      process.exit(1);
    }

    // Validate JWT_SECRET strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret.length < 32) {
      console.error('❌ JWT_SECRET must be at least 32 characters');
      process.exit(1);
    }

    // Validate ENCRYPTION_KEY
    const encKey = process.env.ENCRYPTION_KEY;
    if (encKey.length !== 32) {
      console.error('❌ ENCRYPTION_KEY must be exactly 32 characters');
      process.exit(1);
    }

    console.log('✅ All required environment variables validated');
  }

  loadSecrets() {
    return {
      jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
      },
      encryption: {
        key: process.env.ENCRYPTION_KEY,
        algorithm: 'aes-256-gcm'
      },
      database: {
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true'
      },
      redis: {
        password: process.env.REDIS_PASSWORD
      }
    };
  }

  get(path) {
    const keys = path.split('.');
    let value = this.secrets;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) return undefined;
    }
    
    return value;
  }

  // Generate secure random strings
  static generateSecret(length = 64) {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }

  // Check if running in production
  static isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  // Mask secrets for logging
  static maskSecret(secret, visible = 4) {
    if (!secret || secret.length <= visible * 2) return '***';
    return secret.slice(0, visible) + '***' + secret.slice(-visible);
  }
}

module.exports = new SecurityConfig();
module.exports.SecurityConfig = SecurityConfig;
