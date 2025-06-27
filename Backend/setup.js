/**
 * Unified Setup Script for Bus Tracking System
 * 
 * This script:
 * 1. Creates a centralized .env file with Firebase credentials
 * 2. Creates symbolic links for node_modules to avoid multiple installations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

// Server paths
const ESP8266_PATH = path.join(__dirname, 'Esp8266 server');
const TRACKING_PATH = path.join(__dirname, 'Tracking');
const ADMIN_PATH = path.join(__dirname, 'Bus tracking Admin/Admin/Backend');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to ask questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Main setup function
async function setup() {
  console.log('🚀 Starting unified setup for Bus Tracking System...\n');

  // Step 1: Install dependencies for the main project
  console.log('📦 Installing dependencies (this may take a few minutes)...');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Dependencies installed successfully.\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }

  // Step 2: Create centralized .env file
  console.log('🔧 Setting up environment variables...');
  
  // Check if .env already exists
  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('Found existing .env file. Do you want to keep it or create a new one?');
    const answer = await askQuestion('Enter "keep" to keep existing file or "new" to create a new one: ');
    
    if (answer.toLowerCase() === 'keep') {
      console.log('✅ Keeping existing .env file.\n');
    } else {
      await createEnvFile();
    }
  } else {
    await createEnvFile();
  }

  // Step 3: Create symbolic links for node_modules
  console.log('\n🔗 Setting up symbolic links for node_modules...');
  
  try {
    // Create symbolic links for ESP8266 Server
    await createSymlink('node_modules', ESP8266_PATH);
    
    // Create symbolic links for Tracking Server
    await createSymlink('node_modules', TRACKING_PATH);
    
    // Create symbolic links for Admin Backend
    await createSymlink('node_modules', ADMIN_PATH);
    
    console.log('✅ Symbolic links created successfully.\n');
  } catch (error) {
    console.error('❌ Failed to create symbolic links:', error.message);
    console.log('Note: If symbolic links fail on Windows, you can manually copy node_modules to each folder.');
    console.log('Alternatively, you can run the servers directly from the main Backend folder.');
  }

  console.log('🎉 Setup completed successfully!');
  console.log('You can now run the combined server with: npm start');
  
  rl.close();
}

// Function to create .env file
async function createEnvFile() {
  console.log('Creating new .env file...');
  
  // Get user input for environment variables
  const mongoUri = await askQuestion('Enter MongoDB URI (or press Enter for default): ');
  const jwtSecret = await askQuestion('Enter JWT Secret (or press Enter for random): ');
  const apiBaseUrl = await askQuestion('Enter API Base URL (or press Enter for default): ');
  
  // Firebase configuration
  console.log('\nFirebase Configuration:');
  const firebaseProjectId = await askQuestion('Enter Firebase Project ID (default: bus-tracker-4e0fc): ');
  const firebaseDatabaseUrl = await askQuestion('Enter Firebase Database URL (default: https://bus-tracker-4e0fc-default-rtdb.firebaseio.com): ');
  const firebaseClientEmail = await askQuestion('Enter Firebase Client Email (default: firebase-adminsdk-bus-tracker@bus-tracker-4e0fc.iam.gserviceaccount.com): ');
  
  // Generate default values
  const defaultMongoUri = mongoUri || 'mongodb://localhost:27017/bus-tracking';
  const defaultJwtSecret = jwtSecret || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const defaultApiBaseUrl = apiBaseUrl || 'http://localhost';
  const defaultProjectId = firebaseProjectId || 'bus-tracker-4e0fc';
  const defaultDatabaseUrl = firebaseDatabaseUrl || 'https://bus-tracker-4e0fc-default-rtdb.firebaseio.com';
  const defaultClientEmail = firebaseClientEmail || 'firebase-adminsdk-bus-tracker@bus-tracker-4e0fc.iam.gserviceaccount.com';
  
  // Create .env content
  const envContent = `# Centralized Environment Variables for Bus Tracking System
# Created by setup.js

# Server Port
PORT=3000  # Port for unified server

# MongoDB Configuration
MONGODB_URI=${defaultMongoUri}

# JWT Configuration
JWT_SECRET=${defaultJwtSecret}
JWT_EXPIRY=7d

# API Configuration
API_BASE_URL=${defaultApiBaseUrl}

# Firebase Configuration
FIREBASE_API_KEY=AIzaSyAc_3UzizC6Y-hzI_5fDYmXiTSTwR69oac
FIREBASE_AUTH_DOMAIN=${defaultProjectId}.firebaseapp.com
FIREBASE_DATABASE_URL=${defaultDatabaseUrl}
FIREBASE_PROJECT_ID=${defaultProjectId}
FIREBASE_STORAGE_BUCKET=${defaultProjectId}.appspot.com
FIREBASE_MESSAGING_SENDER_ID=899399291440
FIREBASE_APP_ID=1:899399291440:web:1c4535401988d905e293f5
FIREBASE_MEASUREMENT_ID=G-JFC5HHBVGC

# Firebase Admin SDK Configuration
FIREBASE_TYPE=service_account
FIREBASE_PRIVATE_KEY_ID=0849db45edf7ce912eb97332f7c9d06140652aba
FIREBASE_CLIENT_EMAIL=${defaultClientEmail}
FIREBASE_CLIENT_ID=103042057968763161674
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-4mtdb%40${defaultProjectId}.iam.gserviceaccount.com
FIREBASE_UNIVERSE_DOMAIN=googleapis.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDOLh/sIqo+Wvdx\\noIf63/f9GKRSTxeaYgk1OGtLFyFUbp6z0I5XHdQON3Vu2o+PWkmDOJJIRsfsvPFc\\nK+UMJEMEYI5iTe8tHUAC9psv8b1fMcVxZoHV+b730p4bAXMTcEHus+2YadG79tPw\\nVmXYTR+zG9vF1u5l5Ne2M4mpwaTxuNtIvIaebhyHh4tbEjKupmu75nNd9NqCI9Cn\\nR+oa4Lhhkn3MxMYTkFziefpfOWjUUujtdN8RcYrv1gmFfUPjL3K7K8TFqP1CDknD\\nUxbX7d9lepK27MHyHTaxv1x1vdWXit6y5jl4PAjXIcf7pMNcAOS7Dseln5puvOBQ\\nifJqn0zlAgMBAAECggEADi6mC3wm8bsYIjzEncEiMcqsIu1F1ly//WUwHC4vILur\\nNvs1j1CB8ahm74UhMt8nB1uw1D/qKKKmh4yNaNRlt7tcj+6EcTn92TZVXmrmd9HY\\nnwBKFgnj1PAr5/eljsS+BElkIoPE5YUI9xM6VjKX554W8/jg1Sl0nRfWdFLZobbR\\n3fKRHB27bk7xBo3HOjXL7SEPXQq/xtNbJcJIMhYUolyUMb0alXEHTwolV4N1whVy\\naD0zMJmCSpo9ZmKzV84WunCnw9cylVfmS30lQflVCi5BmF6a94L/ZmTJruPhr1zq\\njU8uiFE8Lyt/gd9qPeLd+C3OnAED0bC0h7PzcAPkAQKBgQDuTA81cVZOvAGQBQSv\\nX3Q2/1I+bnLr/IScWLwjj62vzuN3Ce1WyniC5erHMw6aaeO5GnWHjRY0MjGxHaoh\\ngdScT4JIwn1C/7NhQC723n6NH0kQMRuwFX8Cxog81AiL9q5vP/CQkNOJUVZ1JmJx\\nZbHPb6Ji3k2S6vztp8YbQUWkJQKBgQDdf0O+vPIfVxZCzdRljZrNN2l5aoD6BGv7\\nrsbzf7ZmXI19bgpMYwKvDQ8QjR2PLg6elBlFA/n0Jo5PvQA9ROEq5BZkXEXwhIrb\\nmW8K5jT/2ITjI+ckJA8otZjLYG0/cw5My61vPGBKzOkn0tJT7r/8XLMbTkUXfSHz\\ni29jixBJwQKBgQCh+smLxlKoilt1jjO1EelpSPyau3EawDdUH20jrxKdIsCztefC\\nyzZHpAmHBkmy5K+Kr1WcomapbEUi48s1o47mAZXJ54pF9JH2VS6XWH4lZ1K+0uLD\\nOplvRYxt7KMyoKfJr2jSm99uw/9E+qaH9lx7aKK1Ge8ZIupykUy0UhYIkQKBgQCL\\nxnzsx/WPG3jbzWIkd9jhef9gdHpRzCqMl/3KuaRUMkHDjoaHL9AIwZfpHPQzX6Aw\\nKEtOBzVcAly6Kw4Um/vwAiGzUZt9LVcnP0sYuK9naK5rXEPHxc2fJgH3DbHDYYr7\\noWigEpy9d1QHIn5CIx8aVTFdoOXu7bNYKnyvd5lewQKBgQCIeS0udamrThnn7a3F\\nR2Y9ueT7bHWIintlLycHhXHaoHaBOZXs1DtHAL2KuCyCLVX5QKkR6hpA8vDTrxVg\\nM0nnxS0DJsm9vzeb/rfN5oqREKx9sxPm+tqUZsRhX1LFiaDtWTuECk+/B5x6hpbx\\ndB5gpbtVWObz5Rbv8sJqRYL5Vg==\\n-----END PRIVATE KEY-----\\n"
`;
  
  // Write .env file
  fs.writeFileSync(path.join(__dirname, '.env'), envContent);
  console.log('✅ .env file created successfully.\n');
}

// Function to create symbolic link
async function createSymlink(target, destination) {
  const targetPath = path.join(__dirname, target);
  const linkPath = path.join(destination, target);
  
  // Check if the destination directory exists
  if (!fs.existsSync(destination)) {
    console.log(`Creating directory: ${destination}`);
    fs.mkdirSync(destination, { recursive: true });
  }
  
  // Remove existing node_modules if it's a directory (not a symlink)
  if (fs.existsSync(linkPath)) {
    if (!fs.lstatSync(linkPath).isSymbolicLink()) {
      console.log(`Removing existing ${target} in ${destination}...`);
      try {
        // Use different commands based on platform
        if (process.platform === 'win32') {
          execSync(`rmdir /s /q "${linkPath}"`, { stdio: 'ignore' });
        } else {
          execSync(`rm -rf "${linkPath}"`, { stdio: 'ignore' });
        }
      } catch (error) {
        console.error(`Failed to remove ${linkPath}:`, error.message);
        // Ask if user wants to continue
        const continueSetup = await askQuestion(`Failed to remove ${linkPath}. Continue anyway? (yes/no): `);
        if (continueSetup.toLowerCase() !== 'yes') {
          throw new Error(`Setup aborted by user after failing to remove ${linkPath}`);
        }
        return;
      }
    } else {
      console.log(`Symbolic link already exists at ${linkPath}`);
      return;
    }
  }
  
  // Create symbolic link
  console.log(`Creating symbolic link for ${target} in ${destination}...`);
  
  try {
    // Use different commands based on platform
    if (process.platform === 'win32') {
      try {
        // For Windows, try mklink first
        execSync(`mklink /D "${linkPath}" "${targetPath}"`, { shell: 'cmd.exe', stdio: 'ignore' });
        console.log(`Created symbolic link using mklink`);
      } catch (error) {
        // If mklink fails, try junction
        console.log('Mklink failed, trying junction...');
        try {
          execSync(`New-Item -ItemType Junction -Path "${linkPath}" -Target "${targetPath}"`, { shell: 'powershell.exe', stdio: 'ignore' });
          console.log(`Created junction using PowerShell`);
        } catch (junctionError) {
          // If both fail, try copying the directory
          console.log('Junction failed, copying node_modules directory instead...');
          execSync(`xcopy "${targetPath}" "${linkPath}" /E /I /H /Y`, { shell: 'cmd.exe', stdio: 'inherit' });
          console.log(`Copied node_modules directory`);
        }
      }
    } else {
      // For Unix-based systems
      execSync(`ln -s "${targetPath}" "${linkPath}"`, { stdio: 'ignore' });
    }
  } catch (error) {
    console.error(`Failed to create symbolic link: ${error.message}`);
    console.log('You may need to manually copy node_modules to each server directory.');
  }
}

// Run setup
setup().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});