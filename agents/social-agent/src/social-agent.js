// Social Media Automation Agent
// AI ดูแล Facebook/TikTok โพสต์เนื้อหา ตอบคอมเมนต์ วิเคราะห์ engagement

const { chromium } = require('playwright');
const { v4: uuidv4 } = require('uuid');

class SocialMediaAgent {
  constructor(aiProxy) {
    this.aiProxy = aiProxy;
    this.browsers = new Map();
    this.accounts = new Map();
    this.scheduledPosts = new Map();
    this.active = false;
  }

  // Initialize browser for account
  async initBrowser(accountId, platform, credentials) {
    const browser = await chromium.launch({
      headless: false, // Show browser so user can see AI working
      args: ['--start-maximized']
    });

    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    const page = await context.newPage();

    // Store browser instance
    this.browsers.set(accountId, { browser, context, page, platform });

    // Login to platform
    await this.login(platform, page, credentials);

    return { success: true, accountId };
  }

  // Login to social platform
  async login(platform, page, credentials) {
    try {
      if (platform === 'facebook') {
        await this.loginFacebook(page, credentials);
      } else if (platform === 'tiktok') {
        await this.loginTikTok(page, credentials);
      }

      console.log(`✅ Logged in to ${platform}`);
    } catch (err) {
      console.error(`❌ Login failed:`, err);
      throw err;
    }
  }

  async loginFacebook(page, credentials) {
    await page.goto('https://facebook.com');
    
    // Accept cookies if prompted
    try {
      await page.click('[data-testid="cookie-policy-manage-dialog-accept-button"]', { timeout: 5000 });
    } catch {}

    // Fill login form
    await page.fill('#email', credentials.email);
    await page.fill('#pass', credentials.password);
    await page.click('[data-testid="royal_login_button"]');

    // Wait for login to complete
    await page.waitForSelector('[aria-label="Facebook"]', { timeout: 30000 });

    // Handle 2FA if needed
    try {
      const twoFAInput = await page.$('input[name="approvals_code"]');
      if (twoFAInput && credentials.twoFA) {
        await twoFAInput.fill(credentials.twoFA);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
      }
    } catch {}

    // Save login state
    await page.context().storageState({ path: `./auth/facebook-${credentials.email}.json` });
  }

  async loginTikTok(page, credentials) {
    await page.goto('https://www.tiktok.com/login');
    
    // Click "Use phone / email / username"
    await page.click('div[data-e2e="login-title"]', { timeout: 10000 });
    
    // Switch to email login
    await page.click('a[href="/login/email/phone"]');
    
    // Fill login form
    await page.fill('input[name="username"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button[data-e2e="login-button"]');

    // Wait for login
    await page.waitForSelector('[data-e2e="upload-icon"]', { timeout: 30000 });

    // Save state
    await page.context().storageState({ path: `./auth/tiktok-${credentials.email}.json` });
  }

  // AI Content Generation
  async generateContent(topic, platform, style = 'professional') {
    const prompt = `
Create a social media post for ${platform} about: ${topic}

Style: ${style}
Platform: ${platform}

Requirements:
- Engaging hook in first line
- Use relevant hashtags (3-5)
- Include emojis naturally
- Call to action
- Keep it platform-appropriate

Return as JSON:
{
  "text": "post content",
  "hashtags": ["tag1", "tag2"],
  "bestTimeToPost": "14:00",
  "suggestedImagePrompt": "description for image generation"
}`;

    const response = await this.aiProxy.generate({
      model: 'claude-3-5-sonnet',
      messages: [{ role: 'user', content: prompt }]
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return {
        text: response.content,
        hashtags: [],
        bestTimeToPost: '14:00',
        suggestedImagePrompt: ''
      };
    }
  }

  // Schedule post
  async schedulePost(accountId, postConfig) {
    const postId = `post-${uuidv4().slice(0, 8)}`;
    
    const post = {
      id: postId,
      accountId,
      platform: postConfig.platform,
      content: postConfig.content,
      media: postConfig.media || [],
      scheduledTime: postConfig.scheduledTime,
      status: 'scheduled',
      createdAt: new Date().toISOString()
    };

    this.scheduledPosts.set(postId, post);

    // Schedule the actual post
    const delay = new Date(postConfig.scheduledTime) - Date.now();
    
    if (delay > 0) {
      setTimeout(() => this.executePost(postId), delay);
    } else {
      await this.executePost(postId);
    }

    return { success: true, postId, scheduledTime: postConfig.scheduledTime };
  }

  // Execute scheduled post
  async executePost(postId) {
    const post = this.scheduledPosts.get(postId);
    if (!post) return;

    post.status = 'posting';
    
    const { page, platform } = this.browsers.get(post.accountId);

    try {
      if (platform === 'facebook') {
        await this.postToFacebook(page, post);
      } else if (platform === 'tiktok') {
        await this.postToTikTok(page, post);
      }

      post.status = 'posted';
      post.postedAt = new Date().toISOString();
      
      console.log(`✅ Posted: ${postId}`);
      
    } catch (err) {
      post.status = 'failed';
      post.error = err.message;
      console.error(`❌ Post failed:`, err);
    }
  }

  async postToFacebook(page, post) {
    // Navigate to create post
    await page.goto('https://facebook.com');
    
    // Click "What's on your mind?"
    await page.click('[aria-label="What\'s on your mind?"]');
    await page.waitForTimeout(1000);

    // Type content
    const editor = await page.$('[role="textbox"]');
    await editor.fill(post.content.text);

    // Upload media if any
    if (post.media.length > 0) {
      const fileInput = await page.$('input[type="file"]');
      await fileInput.setInputFiles(post.media);
      await page.waitForTimeout(3000);
    }

    // Click Post
    await page.click('[aria-label="Post"]');
    await page.waitForTimeout(3000);
  }

  async postToTikTok(page, post) {
    // Navigate to upload
    await page.goto('https://www.tiktok.com/upload');
    await page.waitForTimeout(2000);

    // Upload video
    if (post.media[0]) {
      const fileInput = await page.$('input[type="file"]');
      await fileInput.setInputFiles(post.media[0]);
      await page.waitForTimeout(5000);
    }

    // Add caption
    await page.fill('[data-e2e="caption-input"]', post.content.text);

    // Post
    await page.click('[data-e2e="post-button"]');
    await page.waitForTimeout(5000);
  }

  // Auto-respond to comments
  async monitorComments(accountId) {
    const { page, platform } = this.browsers.get(accountId);
    
    this.active = true;

    while (this.active) {
      try {
        if (platform === 'facebook') {
          await this.checkFacebookComments(page, accountId);
        } else if (platform === 'tiktok') {
          await this.checkTikTokComments(page, accountId);
        }

        // Check every 5 minutes
        await page.waitForTimeout(5 * 60 * 1000);
      } catch (err) {
        console.error('Monitor error:', err);
        await page.waitForTimeout(60000);
      }
    }
  }

  async checkFacebookComments(page, accountId) {
    // Navigate to notifications
    await page.goto('https://facebook.com/notifications');
    await page.waitForTimeout(3000);

    // Find comment notifications
    const notifications = await page.$$('[data-testid="notification"]');
    
    for (const notif of notifications.slice(0, 5)) {
      const text = await notif.textContent();
      
      if (text.includes('commented on')) {
        // Click to view
        await notif.click();
        await page.waitForTimeout(2000);

        // Get comment text
        const commentText = await page.$eval('[data-testid="comment-body"]', el => el.textContent);
        
        // Generate AI response
        const response = await this.generateCommentResponse(commentText);
        
        // Reply
        const replyBox = await page.$('[aria-label="Write a comment"]');
        await replyBox.fill(response);
        await replyBox.press('Enter');
        
        console.log(`💬 Replied to comment: ${commentText.slice(0, 50)}...`);
      }
    }
  }

  async checkTikTokComments(page, accountId) {
    // Go to inbox
    await page.goto('https://www.tiktok.com/messages');
    await page.waitForTimeout(3000);

    // Check for new comments
    const comments = await page.$$('[data-e2e="comment-item"]');
    
    for (const comment of comments.slice(0, 3)) {
      const text = await comment.textContent();
      
      // Generate response
      const response = await this.generateCommentResponse(text);
      
      // Reply
      const replyBtn = await comment.$('[data-e2e="reply-button"]');
      await replyBtn.click();
      
      const input = await page.$('[data-e2e="comment-input"]');
      await input.fill(response);
      await input.press('Enter');
    }
  }

  async generateCommentResponse(commentText) {
    const prompt = `
Generate a friendly, engaging reply to this social media comment:
"${commentText}"

Requirements:
- Keep it short (1-2 sentences)
- Be authentic and friendly
- Use emojis naturally
- Ask a follow-up question when appropriate

Reply:`;

    const response = await this.aiProxy.generate({
      model: 'claude-3-5-sonnet',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 100
    });

    return response.content.trim();
  }

  // Analytics
  async getAnalytics(accountId) {
    const { page, platform } = this.browsers.get(accountId);

    if (platform === 'facebook') {
      return this.getFacebookAnalytics(page);
    } else if (platform === 'tiktok') {
      return this.getTikTokAnalytics(page);
    }
  }

  async getFacebookAnalytics(page) {
    await page.goto('https://www.facebook.com/me/posts');
    await page.waitForTimeout(3000);

    // Extract post data
    const posts = await page.evaluate(() => {
      const data = [];
      document.querySelectorAll('[data-testid="story-subtitle"]').forEach((el, i) => {
        const parent = el.closest('[role="article"]');
        if (parent) {
          const likes = parent.querySelector('[aria-label*="Like"]')?.textContent || '0';
          const comments = parent.querySelector('[aria-label*="Comment"]')?.textContent || '0';
          const shares = parent.querySelector('[aria-label*="Share"]')?.textContent || '0';
          
          data.push({ likes, comments, shares });
        }
      });
      return data.slice(0, 5);
    });

    return {
      platform: 'facebook',
      posts,
      summary: {
        totalLikes: posts.reduce((sum, p) => sum + parseInt(p.likes) || 0, 0),
        totalComments: posts.reduce((sum, p) => sum + parseInt(p.comments) || 0, 0),
        totalShares: posts.reduce((sum, p) => sum + parseInt(p.shares) || 0, 0)
      }
    };
  }

  async getTikTokAnalytics(page) {
    await page.goto('https://www.tiktok.com/analytics');
    await page.waitForTimeout(3000);

    // Extract analytics
    const stats = await page.evaluate(() => {
      return {
        followers: document.querySelector('[data-e2e="followers-count"]')?.textContent || '0',
        views: document.querySelector('[data-e2e="views-count"]')?.textContent || '0',
        likes: document.querySelector('[data-e2e="likes-count"]')?.textContent || '0'
      };
    });

    return {
      platform: 'tiktok',
      stats
    };
  }

  // Content Calendar
  async generateContentCalendar(accountId, days = 7) {
    const topics = [
      'Industry tips',
      'Behind the scenes',
      'User generated content',
      'Product showcase',
      'Educational content',
      'Trending topic',
      'Q&A session'
    ];

    const calendar = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const topic = topics[i % topics.length];
      const content = await this.generateContent(topic, 'general');
      
      calendar.push({
        date: date.toISOString().split('T')[0],
        topic,
        content,
        bestTime: content.bestTimeToPost
      });
    }

    return calendar;
  }

  // Stop monitoring
  stopMonitoring() {
    this.active = false;
  }

  // Close browser
  async closeBrowser(accountId) {
    const { browser } = this.browsers.get(accountId);
    await browser.close();
    this.browsers.delete(accountId);
  }

  // Get all accounts
  getAccounts() {
    return Array.from(this.accounts.entries()).map(([id, acc]) => ({
      id,
      platform: acc.platform,
      email: acc.email,
      status: this.browsers.has(id) ? 'connected' : 'disconnected'
    }));
  }

  // Get scheduled posts
  getScheduledPosts(accountId) {
    return Array.from(this.scheduledPosts.values())
      .filter(p => p.accountId === accountId);
  }
}

module.exports = SocialMediaAgent;
