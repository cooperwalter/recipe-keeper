#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '..', '.next');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function cleanProblematicFiles() {
  log('🧹 Cleaning problematic cache files...', 'yellow');
  
  const filesToClean = [
    // Build manifests that often get corrupted
    path.join(nextDir, 'build-manifest.json'),
    path.join(nextDir, 'app-build-manifest.json'),
    path.join(nextDir, 'app-paths-manifest.json'),
    path.join(nextDir, 'server', 'app-paths-manifest.json'),
    
    // Problematic favicon metadata
    path.join(nextDir, 'server', 'app', 'favicon.ico'),
    
    // Webpack cache that can get corrupted
    path.join(nextDir, 'cache', 'webpack'),
    
    // Runtime files
    path.join(nextDir, 'static', 'chunks', 'webpack-runtime-main.js'),
  ];
  
  let cleanedCount = 0;
  
  for (const filePath of filesToClean) {
    try {
      if (fs.existsSync(filePath)) {
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
        cleanedCount++;
        log(`  ✓ Cleaned: ${path.relative(nextDir, filePath)}`, 'green');
      }
    } catch (error) {
      log(`  ⚠️  Error cleaning ${path.basename(filePath)}: ${error.message}`, 'red');
    }
  }
  
  if (cleanedCount > 0) {
    log(`✅ Cleaned ${cleanedCount} problematic files`, 'green');
  } else {
    log('✅ No problematic files found', 'green');
  }
}

// Run the cleanup
cleanProblematicFiles();