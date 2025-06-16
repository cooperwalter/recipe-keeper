#!/usr/bin/env node

const { execSync } = require('child_process');

const port = process.argv[2] || 3002;

console.log(`🔍 Checking for processes on port ${port}...`);

try {
  // Find process using the port
  const command = process.platform === 'win32'
    ? `netstat -ano | findstr :${port}`
    : `lsof -ti:${port}`;
  
  const result = execSync(command, { encoding: 'utf8' }).trim();
  
  if (result) {
    console.log(`⚠️  Found process on port ${port}`);
    
    // Kill the process
    if (process.platform === 'win32') {
      // On Windows, parse the PID from netstat output
      const lines = result.split('\n');
      lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && !isNaN(pid)) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            console.log(`✅ Killed process ${pid}`);
          } catch (e) {
            // Process might already be dead
          }
        }
      });
    } else {
      // On Unix-like systems
      const pids = result.split('\n').filter(pid => pid.trim());
      pids.forEach(pid => {
        try {
          execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
          console.log(`✅ Killed process ${pid}`);
        } catch (e) {
          // Process might already be dead
        }
      });
    }
    
    console.log(`🎉 Port ${port} is now free`);
  } else {
    console.log(`✅ Port ${port} is already free`);
  }
} catch (error) {
  // No process found on the port
  console.log(`✅ Port ${port} is free`);
}