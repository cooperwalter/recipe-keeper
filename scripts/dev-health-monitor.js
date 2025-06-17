#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const chokidar = require('chokidar');

const nextDir = path.join(__dirname, '..', '.next');
const PORT = process.env.PORT || 3002;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// Health check configuration
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
const MAX_FAILED_HEALTH_CHECKS = 3;
const UNRESPONSIVE_TIMEOUT = 60000; // 1 minute

// Track server state
let healthCheckFailures = 0;
let lastHealthCheckTime = Date.now();
let isServerHealthy = false;
let lastResponseTime = Date.now();

// Track errors
let errorCount = 0;
let lastErrorTime = 0;
const ERROR_THRESHOLD = 3;
const ERROR_WINDOW = 5000; // 5 seconds

// Patterns that indicate issues
const criticalErrorPatterns = [
  'ENOENT.*_buildManifest',
  'ENOENT.*app-paths-manifest',
  'ENOENT.*webpack-runtime',
  'ENOENT.*__metadata_id__',
  'Cannot find module.*_buildManifest',
  'Module not found.*app-paths-manifest',
  'ECONNREFUSED',
  'EADDRINUSE',
  'Cannot read properties of undefined',
  'Maximum call stack size exceeded',
];

const unresponsivePatterns = [
  'Watchpack Error',
  'EMFILE',
  'too many open files',
  'JavaScript heap out of memory',
];

function isCriticalError(error) {
  const errorStr = error.toString();
  return criticalErrorPatterns.some(pattern => 
    new RegExp(pattern, 'i').test(errorStr)
  );
}

function isUnresponsiveError(error) {
  const errorStr = error.toString();
  return unresponsivePatterns.some(pattern => 
    new RegExp(pattern, 'i').test(errorStr)
  );
}

function performHealthCheck() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Health check timeout'));
    }, HEALTH_CHECK_TIMEOUT);

    http.get(`http://localhost:${PORT}/api/health`, (res) => {
      clearTimeout(timeout);
      
      if (res.statusCode === 200 || res.statusCode === 404) {
        // 404 is ok - means server is responding but health endpoint doesn't exist
        resolve(true);
      } else {
        reject(new Error(`Health check failed with status ${res.statusCode}`));
      }
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function killPort() {
  try {
    log(`🔍 Checking for processes on port ${PORT}...`, 'yellow');
    execSync(`node ${path.join(__dirname, 'kill-port.js')} ${PORT}`, { stdio: 'inherit' });
  } catch (error) {
    log(`⚠️  Error killing port: ${error.message}`, 'yellow');
  }
}

function cleanNextDir() {
  log('🧹 Cleaning .next directory...', 'yellow');
  try {
    if (fs.existsSync(nextDir)) {
      fs.rmSync(nextDir, { recursive: true, force: true });
      log('✅ .next directory cleaned', 'green');
    }
  } catch (error) {
    log(`❌ Error cleaning .next directory: ${error.message}`, 'red');
  }
}

function cleanCacheFiles() {
  log('🧹 Cleaning cache files...', 'yellow');
  try {
    const problematicDirs = [
      path.join(nextDir, 'server', 'app'),
      path.join(nextDir, 'cache'),
      path.join(nextDir, 'build-manifest.json'),
      path.join(nextDir, 'app-paths-manifest.json'),
      path.join(nextDir, 'react-loadable-manifest.json'),
    ];
    
    for (const dir of problematicDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
    
    // Also clean node_modules/.cache if it exists
    const nodeModulesCache = path.join(__dirname, '..', 'node_modules', '.cache');
    if (fs.existsSync(nodeModulesCache)) {
      fs.rmSync(nodeModulesCache, { recursive: true, force: true });
      log('✅ node_modules cache cleaned', 'green');
    }
    
    log('✅ Cache files cleaned', 'green');
  } catch (error) {
    log(`⚠️  Error cleaning cache files: ${error.message}`, 'yellow');
  }
}

class DevServer {
  constructor() {
    this.process = null;
    this.isRestarting = false;
    this.restartTimeout = null;
    this.healthCheckInterval = null;
    this.unresponsiveTimeout = null;
  }

  start() {
    if (this.isRestarting) {
      log('⏳ Restart already in progress...', 'yellow');
      return;
    }

    killPort();
    
    log(`🚀 Starting development server on port ${PORT}...`, 'blue');
    
    // Set environment variables for better stability
    const env = {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=4096', // Increase memory limit
      WATCHPACK_POLLING: 'true', // Use polling for file watching
      CHOKIDAR_USEPOLLING: 'true',
      CHOKIDAR_INTERVAL: '300',
    };
    
    this.process = spawn('pnpm', ['next', 'dev', '--turbopack', '-p', PORT], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      env,
    });

    let startupComplete = false;

    // Handle stdout
    this.process.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(data);
      
      // Track server responsiveness
      lastResponseTime = Date.now();
      
      // Check if server is ready
      if (output.includes('Ready in') || output.includes('compiled successfully')) {
        if (!startupComplete) {
          startupComplete = true;
          isServerHealthy = true;
          this.startHealthChecks();
          log('✅ Server is ready and healthy', 'green');
        }
        errorCount = 0;
        healthCheckFailures = 0;
      }
      
      // Reset unresponsive timeout on any output
      this.resetUnresponsiveTimeout();
    });

    // Handle stderr
    this.process.stderr.on('data', (data) => {
      const errorStr = data.toString();
      process.stderr.write(data);
      
      // Track server responsiveness
      lastResponseTime = Date.now();
      
      // Check for unresponsive patterns
      if (isUnresponsiveError(errorStr)) {
        log('🚨 Detected unresponsive server pattern', 'red');
        this.scheduleRestart(true, true);
        return;
      }
      
      // Check for critical errors
      if (isCriticalError(errorStr)) {
        const now = Date.now();
        
        if (now - lastErrorTime < ERROR_WINDOW) {
          errorCount++;
        } else {
          errorCount = 1;
        }
        lastErrorTime = now;
        
        log(`⚠️  Critical error detected (${errorCount}/${ERROR_THRESHOLD})`, 'yellow');
        
        if (errorCount >= ERROR_THRESHOLD) {
          log('🔄 Error threshold reached, scheduling restart...', 'yellow');
          this.scheduleRestart(true);
        }
      }
    });

    this.process.on('error', (error) => {
      log(`💥 Process error: ${error.message}`, 'red');
      this.scheduleRestart(true);
    });

    this.process.on('close', (code) => {
      if (code !== 0 && code !== null && !this.isRestarting) {
        log(`💥 Dev server exited with code ${code}`, 'red');
        this.scheduleRestart(true);
      }
    });

    // Set up unresponsive detection
    this.resetUnresponsiveTimeout();
  }

  startHealthChecks() {
    // Clear any existing interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Perform health checks periodically
    this.healthCheckInterval = setInterval(async () => {
      try {
        await performHealthCheck();
        
        if (!isServerHealthy) {
          log('✅ Server is responding again', 'green');
          isServerHealthy = true;
        }
        
        healthCheckFailures = 0;
        lastHealthCheckTime = Date.now();
      } catch (error) {
        healthCheckFailures++;
        log(`❌ Health check failed (${healthCheckFailures}/${MAX_FAILED_HEALTH_CHECKS}): ${error.message}`, 'yellow');
        
        if (healthCheckFailures >= MAX_FAILED_HEALTH_CHECKS) {
          log('🚨 Server is not responding to health checks', 'red');
          isServerHealthy = false;
          this.scheduleRestart(true);
        }
      }
    }, HEALTH_CHECK_INTERVAL);
  }

  resetUnresponsiveTimeout() {
    if (this.unresponsiveTimeout) {
      clearTimeout(this.unresponsiveTimeout);
    }

    this.unresponsiveTimeout = setTimeout(() => {
      const timeSinceLastResponse = Date.now() - lastResponseTime;
      
      if (timeSinceLastResponse > UNRESPONSIVE_TIMEOUT) {
        log(`🚨 Server has been unresponsive for ${Math.round(timeSinceLastResponse / 1000)}s`, 'red');
        this.scheduleRestart(true, true);
      }
    }, UNRESPONSIVE_TIMEOUT);
  }

  scheduleRestart(cleanCache = false, fullClean = false) {
    if (this.isRestarting) return;
    
    this.isRestarting = true;
    errorCount = 0;
    healthCheckFailures = 0;
    
    // Clear intervals and timeouts
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }
    
    if (this.unresponsiveTimeout) {
      clearTimeout(this.unresponsiveTimeout);
    }
    
    // Kill the current process
    if (this.process) {
      log('🛑 Stopping current process...', 'yellow');
      this.process.kill('SIGTERM');
      
      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.process) {
          log('⚠️  Force killing process...', 'red');
          this.process.kill('SIGKILL');
        }
      }, 5000);
      
      this.process = null;
    }
    
    this.restartTimeout = setTimeout(() => {
      if (fullClean) {
        log('🧹 Performing full cleanup...', 'yellow');
        cleanNextDir();
      } else if (cleanCache) {
        cleanCacheFiles();
      }
      
      this.isRestarting = false;
      this.start();
    }, 3000);
  }

  stop() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.unresponsiveTimeout) {
      clearTimeout(this.unresponsiveTimeout);
    }
    
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
  }
}

// Initialize server
const devServer = new DevServer();

// Watch for file system issues
const watcher = chokidar.watch(nextDir, {
  persistent: true,
  ignoreInitial: true,
  depth: 2,
  // Use polling to avoid EMFILE errors
  usePolling: true,
  interval: 1000,
});

watcher.on('unlink', (filePath) => {
  if (filePath.includes('app-paths-manifest') || 
      filePath.includes('_buildManifest') ||
      filePath.includes('webpack-runtime')) {
    log(`📁 Critical file deleted: ${path.basename(filePath)}`, 'yellow');
    devServer.scheduleRestart(true);
  }
});

// Handle process signals
process.on('SIGINT', () => {
  log('\n👋 Shutting down dev server...', 'yellow');
  watcher.close();
  devServer.stop();
  process.exit();
});

process.on('SIGTERM', () => {
  watcher.close();
  devServer.stop();
  process.exit();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`🚨 Uncaught exception: ${error.message}`, 'red');
  console.error(error);
  devServer.scheduleRestart(true);
});

// Initial start
log('🏗️  Recipe Keeper Development Server (Enhanced)', 'green');
log('================================================', 'green');
log('⚡ Auto-restart on critical errors', 'magenta');
log('💓 Health monitoring enabled', 'cyan');
log('🛡️  Unresponsive detection active', 'cyan');
log('📁 File system monitoring active', 'magenta');
log('');

// Check if we should clean first
if (process.argv.includes('--clean')) {
  cleanNextDir();
}

devServer.start();