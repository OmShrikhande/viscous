const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');

// Clean up existing node_modules if it exists
if (fs.existsSync(nodeModulesPath)) {
  console.log('Cleaning up existing node_modules...');
  try {
    // On Windows, we need to use rimraf or a similar approach
    // since recursive directory deletion can be problematic
    if (process.platform === 'win32') {
      // Use a simple approach that works on Windows
      execSync('rmdir /s /q "' + nodeModulesPath + '"', { stdio: 'inherit' });
    } else {
      // On Unix-like systems
      execSync('rm -rf "' + nodeModulesPath + '"', { stdio: 'inherit' });
    }
    console.log('Cleaned up node_modules successfully.');
  } catch (error) {
    console.error('Error cleaning up node_modules:', error.message);
    console.log('You may need to manually delete the node_modules directory.');
  }
}

console.log('Installing dependencies...');

// Create a minimal package.json if it doesn't exist
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.log('Creating package.json...');
  const packageJson = {
    "name": "bus-tracking-server",
    "version": "1.0.0",
    "description": "Backend server for bus tracking and stop detection",
    "main": "server.js",
    "scripts": {
      "start": "node server.js",
      "dev": "nodemon server.js",
      "setup": "node install-deps.js"
    }
  };
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

// Install dependencies
try {
  // Install core dependencies one by one to avoid issues
  console.log('Installing express...');
  execSync('npm install express@4.18.2', { stdio: 'inherit' });
  
  console.log('Installing firebase...');
  execSync('npm install firebase@10.7.1', { stdio: 'inherit' });
  
  console.log('Installing geolib...');
  execSync('npm install geolib@3.3.4', { stdio: 'inherit' });
  
  console.log('Installing cors...');
  execSync('npm install cors@2.8.5', { stdio: 'inherit' });
  
  console.log('Installing dotenv...');
  execSync('npm install dotenv@16.3.1', { stdio: 'inherit' });
  
  console.log('All dependencies installed successfully!');
} catch (error) {
  console.error('Error installing dependencies:', error.message);
  process.exit(1);
}

console.log('Ready to start the server. Run: node server.js');