#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '..', '.next');
const PORT = process.env.PORT || 3002;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
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

function startDevServer() {
  log(`🚀 Starting development server on port ${PORT}...`, 'blue');
  
  const devServer = spawn('pnpm', ['next', 'dev', '--turbopack', '-p', PORT], {
    stdio: 'inherit',
    shell: true,
  });

  let errorCount = 0;
  let lastErrorTime = Date.now();

  devServer.on('error', (error) => {
    const now = Date.now();
    
    // If we get multiple errors in quick succession, it's likely the build manifest issue
    if (now - lastErrorTime < 5000) {
      errorCount++;
    } else {
      errorCount = 1;
    }
    lastErrorTime = now;

    if (error.message.includes('ENOENT') && error.message.includes('_buildManifest')) {
      log('⚠️  Build manifest error detected', 'yellow');
      
      if (errorCount > 3) {
        log('🔄 Multiple errors detected, restarting server...', 'yellow');
        devServer.kill();
        setTimeout(() => {
          cleanNextDir();
          startDevServer();
        }, 1000);
      }
    }
  });

  devServer.on('close', (code) => {
    if (code !== 0 && code !== null) {
      log(`💥 Dev server exited with code ${code}`, 'red');
      log('🔄 Restarting in 2 seconds...', 'yellow');
      setTimeout(() => {
        cleanNextDir();
        startDevServer();
      }, 2000);
    }
  });

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    log('\n👋 Shutting down dev server...', 'yellow');
    devServer.kill();
    process.exit();
  });
}

// Initial start
log('🏗️  Recipe Keeper Development Server', 'green');
log('================================', 'green');

// Check if we should clean first (if there's a --clean flag)
if (process.argv.includes('--clean')) {
  cleanNextDir();
}

startDevServer();