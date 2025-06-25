/**
 * Install All Dependencies Script
 * 
 * This script installs dependencies for all three backend services:
 * 1. ESP8266 Server
 * 2. Tracking Server
 * 3. Admin Backend
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration for each server
const servers = [
  {
    name: 'ESP8266 Server',
    path: path.join(__dirname, 'Esp8266 server')
  },
  {
    name: 'Tracking Server',
    path: path.join(__dirname, 'Tracking')
  },
  {
    name: 'Admin Backend',
    path: path.join(__dirname, 'Bus tracking Admin/Admin/Backend')
  }
];

// Install dependencies for the main project
console.log('Installing dependencies for the main project...');
try {
  execSync('npm install', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Main project dependencies installed successfully.');
} catch (error) {
  console.error('❌ Failed to install main project dependencies:', error.message);
}

// Install dependencies for each server
servers.forEach(server => {
  console.log(`\nInstalling dependencies for ${server.name}...`);
  
  // Check if package.json exists
  const packageJsonPath = path.join(server.path, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error(`❌ package.json not found at ${packageJsonPath}`);
    return;
  }
  
  try {
    // Run npm install
    execSync('npm install', { stdio: 'inherit', cwd: server.path });
    console.log(`✅ ${server.name} dependencies installed successfully.`);
  } catch (error) {
    console.error(`❌ Failed to install dependencies for ${server.name}:`, error.message);
  }
});

console.log('\n🎉 All dependencies installation completed!');
console.log('You can now run the combined server with: npm start');