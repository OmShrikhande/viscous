/**
 * Combined Server Entry Point
 * 
 * This file starts all three backend services:
 * 1. ESP8266 Server - Receives data from NodeMCU and sends to Firebase
 * 2. Tracking Server - Monitors bus location and updates stop status
 * 3. Admin Backend - Provides admin functionality and frontend
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration for each server
const servers = [
  {
    name: 'ESP8266 Server',
    path: path.join(__dirname, 'Esp8266 server'),
    script: 'Server.cjs',
    port: 3001,
    env: { PORT: 3001 }
  },
  {
    name: 'Tracking Server',
    path: path.join(__dirname, 'Tracking'),
    script: 'server.js',
    port: 3002,
    env: { PORT: 3002 }
  },
  {
    name: 'Admin Backend',
    path: path.join(__dirname, 'Bus tracking Admin/Admin/Backend'),
    script: 'server.js',
    port: 5000,
    env: { PORT: 5000 }
  }
];

// Function to start a server
function startServer(server) {
  console.log(`Starting ${server.name}...`);
  
  // Check if the script exists
  const scriptPath = path.join(server.path, server.script);
  if (!fs.existsSync(scriptPath)) {
    console.error(`Error: Script not found at ${scriptPath}`);
    return null;
  }
  
  // Set environment variables
  const env = { ...process.env, ...server.env };
  
  // Spawn the process
  const child = spawn('node', [scriptPath], {
    cwd: server.path,
    env,
    stdio: 'pipe'
  });
  
  // Handle stdout
  child.stdout.on('data', (data) => {
    console.log(`[${server.name}] ${data.toString().trim()}`);
  });
  
  // Handle stderr
  child.stderr.on('data', (data) => {
    console.error(`[${server.name}] ERROR: ${data.toString().trim()}`);
  });
  
  // Handle process exit
  child.on('close', (code) => {
    console.log(`[${server.name}] process exited with code ${code}`);
    
    // Restart the server if it crashes
    if (code !== 0 && code !== null) {
      console.log(`Restarting ${server.name}...`);
      setTimeout(() => {
        startServer(server);
      }, 5000); // Wait 5 seconds before restarting
    }
  });
  
  return child;
}

// Start all servers
const processes = servers.map(startServer).filter(Boolean);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down all servers...');
  
  // Kill all child processes
  processes.forEach((proc) => {
    proc.kill();
  });
  
  // Exit after a short delay
  setTimeout(() => {
    console.log('All servers stopped.');
    process.exit(0);
  }, 1000);
});

console.log('All servers started successfully!');
console.log('Press Ctrl+C to stop all servers.');