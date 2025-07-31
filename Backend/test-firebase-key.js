const dotenv = require('dotenv');
const admin = require('firebase-admin');

dotenv.config();

console.log('=== FIREBASE PRIVATE KEY VALIDATION ===');

// Test 1: Use the key as-is (since it already has proper newlines)
try {
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE || 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '0849db45edf7ce912eb97332f7c9d06140652aba',
    private_key: process.env.FIREBASE_PRIVATE_KEY, // Use as-is without .replace()
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID || '103042057968763161674',
    auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com'
  };

  console.log('Test 1: Trying key without .replace() processing...');
  
  // Test creating the credential
  const credential = admin.credential.cert(serviceAccount);
  console.log('✅ SUCCESS: Private key parsed successfully without .replace() processing!');
  
  // If we reach here, the key works
  process.exit(0);
  
} catch (error) {
  console.log('❌ Test 1 FAILED:', error.message);
}

// Test 2: Use the key with .replace() processing (original method)
try {
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE || 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '0849db45edf7ce912eb97332f7c9d06140652aba',
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Original problematic method
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID || '103042057968763161674',
    auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com'
  };

  console.log('Test 2: Trying key with .replace() processing (original method)...');
  
  // Test creating the credential
  const credential = admin.credential.cert(serviceAccount);
  console.log('✅ SUCCESS: Private key parsed successfully with .replace() processing!');
  
} catch (error) {
  console.log('❌ Test 2 FAILED:', error.message);
}

// Test 3: Check if the private key needs to be stripped of quotes
try {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  // Remove surrounding quotes if present
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  }
  
  const serviceAccount = {
    type: process.env.FIREBASE_TYPE || 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '0849db45edf7ce912eb97332f7c9d06140652aba',
    private_key: privateKey,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID || '103042057968763161674',
    auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || 'googleapis.com'
  };

  console.log('Test 3: Trying key with quote removal...');
  
  // Test creating the credential
  const credential = admin.credential.cert(serviceAccount);
  console.log('✅ SUCCESS: Private key parsed successfully with quote removal!');
  
} catch (error) {
  console.log('❌ Test 3 FAILED:', error.message);
}