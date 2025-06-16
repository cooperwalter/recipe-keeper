#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
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
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Track error counts
let errorCount = 0;
let lastErrorTime = 0;
const ERROR_THRESHOLD = 3;
const ERROR_WINDOW = 5000; // 5 seconds

// Patterns that indicate filesystem corruption
const criticalErrorPatterns = [
  'ENOENT.*_buildManifest',
  'ENOENT.*app-paths-manifest',
  'ENOENT.*webpack-runtime',
  'ENOENT.*__metadata_id__',
  'Cannot find module.*_buildManifest',
  'Module not found.*app-paths-manifest',
];

function isCriticalError(error) {
  const errorStr = error.toString();
  return criticalErrorPatterns.some(pattern => 
    new RegExp(pattern, 'i').test(errorStr)
  );
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
    // Clean specific problematic directories
    const problematicDirs = [
      path.join(nextDir, 'server', 'app', 'favicon.ico'),
      path.join(nextDir, 'cache', 'webpack'),
      path.join(nextDir, 'build-manifest.json'),
      path.join(nextDir, 'app-paths-manifest.json'),
    ];
    
    for (const dir of problematicDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
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
  }

  start() {
    if (this.isRestarting) {
      log('⏳ Restart already in progress...', 'yellow');
      return;
    }

    killPort();
    
    log(`🚀 Starting development server on port ${PORT}...`, 'blue');
    
    this.process = spawn('pnpm', ['next', 'dev', '--turbopack', '-p', PORT], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
    });

    // Handle stdout
    this.process.stdout.on('data', (data) => {
      process.stdout.write(data);
      
      // Reset error count on successful compilation
      if (data.toString().includes('Compiled') || data.toString().includes('Ready')) {
        errorCount = 0;
      }
    });

    // Handle stderr
    this.process.stderr.on('data', (data) => {
      const errorStr = data.toString();
      process.stderr.write(data);
      
      // Check for critical errors
      if (isCriticalError(errorStr)) {
        const now = Date.now();
        
        // Track errors within time window
        if (now - lastErrorTime < ERROR_WINDOW) {
          errorCount++;
        } else {
          errorCount = 1;
        }
        lastErrorTime = now;
        
        log(`⚠️  Critical error detected (${errorCount}/${ERROR_THRESHOLD})`, 'yellow');
        
        // Auto-restart if threshold reached
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
        this.scheduleRestart(false);
      }
    });
  }

  scheduleRestart(cleanCache = false) {
    if (this.isRestarting) return;
    
    this.isRestarting = true;
    errorCount = 0;
    
    // Clear any existing restart timeout
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }
    
    // Kill the current process
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    
    this.restartTimeout = setTimeout(() => {
      if (cleanCache) {
        cleanCacheFiles();
      }
      this.isRestarting = false;
      this.start();
    }, 2000);
  }

  stop() {
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
});

watcher.on('unlink', (filePath) => {
  if (filePath.includes('app-paths-manifest') || filePath.includes('_buildManifest')) {
    log(`📁 Critical file deleted: ${path.basename(filePath)}`, 'yellow');
    devServer.scheduleRestart(true);
  }
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n👋 Shutting down dev server...', 'yellow');
  watcher.close();
  devServer.stop();
  process.exit();
});

// Handle other termination signals
process.on('SIGTERM', () => {
  watcher.close();
  devServer.stop();
  process.exit();
});

// Initial start
log('🏗️  Recipe Keeper Development Server (with auto-recovery)', 'green');
log('================================================', 'green');
log('⚡ Auto-restart on critical errors enabled', 'magenta');
log('📁 File system monitoring active', 'magenta');
log('');

// Check if we should clean first
if (process.argv.includes('--clean')) {
  cleanNextDir();
}

devServer.start();