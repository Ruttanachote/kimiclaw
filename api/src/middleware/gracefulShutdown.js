// Graceful Shutdown Handler
// ปิดตัวอย่างสงบ ไม่ทำให้ข้อมูลเสีย

class GracefulShutdown {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000; // 30 seconds
    this.handlers = [];
    this.isShuttingDown = false;
  }

  // Register a shutdown handler
  onShutdown(name, handler) {
    this.handlers.push({ name, handler });
    console.log(`✅ Registered shutdown handler: ${name}`);
  }

  // Execute all shutdown handlers
  async shutdown(signal) {
    if (this.isShuttingDown) {
      console.log('⚠️ Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    const startTime = Date.now();
    const results = [];

    // Execute handlers in sequence
    for (const { name, handler } of this.handlers) {
      try {
        console.log(`  → Closing ${name}...`);
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.timeout)
        );
        
        await Promise.race([handler(), timeoutPromise]);
        
        results.push({ name, status: 'success' });
        console.log(`    ✅ ${name} closed`);
        
      } catch (err) {
        results.push({ name, status: 'error', error: err.message });
        console.error(`    ❌ ${name} failed:`, err.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`\n⏱️ Shutdown completed in ${duration}ms`);

    // Exit with appropriate code
    const hasErrors = results.some(r => r.status === 'error');
    process.exit(hasErrors ? 1 : 0);
  }

  // Setup signal handlers
  setup() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    
    // Handle uncaught errors during shutdown
    process.on('uncaughtException', (err) => {
      console.error('💥 Uncaught exception during shutdown:', err);
      process.exit(1);
    });

    console.log('✅ Graceful shutdown handlers registered');
  }
}

// Create singleton instance
const shutdownManager = new GracefulShutdown();

// Common shutdown handlers
const createShutdownHandlers = (services) => {
  return {
    // HTTP Server
    httpServer: (server) => ({
      name: 'HTTP Server',
      handler: () => new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      })
    }),

    // WebSocket Server
    wsServer: (wss) => ({
      name: 'WebSocket Server',
      handler: () => new Promise((resolve) => {
        // Close all connections
        wss.clients.forEach((ws) => {
          ws.close(1001, 'Server shutting down');
        });
        
        wss.close(() => {
          console.log('    WebSocket connections closed');
          resolve();
        });
      })
    }),

    // Database Pool
    database: (pool) => ({
      name: 'Database Pool',
      handler: async () => {
        await pool.end();
      }
    }),

    // Redis Client
    redis: (client) => ({
      name: 'Redis Client',
      handler: async () => {
        await client.quit();
      }
    }),

    // Health Check Interval
    healthChecker: (checker) => ({
      name: 'Health Checker',
      handler: () => {
        checker.stopPeriodicChecks();
      }
    }),

    // Active Tasks
    activeTasks: (taskManager) => ({
      name: 'Active Tasks',
      handler: async () => {
        const tasks = taskManager.getActiveTasks();
        
        if (tasks.length > 0) {
          console.log(`    Waiting for ${tasks.length} active tasks...`);
          
          // Cancel or wait for tasks
          await Promise.all(
            tasks.map(task => 
              taskManager.cancelTask(task.id).catch(() => {})
            )
          );
        }
      }
    }),

    // File Streams
    fileStreams: (streams) => ({
      name: 'File Streams',
      handler: () => new Promise((resolve) => {
        let closed = 0;
        
        if (streams.length === 0) {
          resolve();
          return;
        }
        
        streams.forEach(stream => {
          stream.end(() => {
            closed++;
            if (closed === streams.length) resolve();
          });
        });
      })
    })
  };
};

module.exports = {
  GracefulShutdown,
  shutdownManager,
  createShutdownHandlers
};
