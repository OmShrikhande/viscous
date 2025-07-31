const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

console.log('=== DETAILED PRIVATE KEY ANALYSIS ===');

const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!privateKey) {
  console.log('❌ FIREBASE_PRIVATE_KEY is not set in environment');
  process.exit(1);
}

console.log('Length:', privateKey.length);
console.log('Starts with quotes:', privateKey.startsWith('"'));
console.log('Ends with quotes:', privateKey.endsWith('"'));

// Remove quotes if present
let cleanKey = privateKey;
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  cleanKey = privateKey.slice(1, -1);
  console.log('Length after removing quotes:', cleanKey.length);
}

// Split into lines and analyze
const lines = cleanKey.split('\n');
console.log('Number of lines:', lines.length);
console.log('First line:', JSON.stringify(lines[0]));
console.log('Last line:', JSON.stringify(lines[lines.length - 1]));

// Check for proper PEM format
const expectedStart = '-----BEGIN PRIVATE KEY-----';
const expectedEnd = '-----END PRIVATE KEY-----';

console.log('Starts with correct header:', lines[0] === expectedStart);
console.log('Ends with correct footer:', lines[lines.length - 1] === expectedEnd);

// Check content lines (should be base64)
console.log('\n=== CONTENT ANALYSIS ===');
const contentLines = lines.slice(1, -1); // Remove header and footer
console.log('Number of content lines:', contentLines.length);

// A typical RSA 2048-bit private key has about 26-27 content lines
if (contentLines.length < 20) {
  console.log('⚠️  WARNING: Too few content lines. Key might be truncated.');
}

// Check if content lines contain only valid base64 characters
const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
let invalidLines = [];
contentLines.forEach((line, index) => {
  if (line.trim() && !base64Regex.test(line)) {
    invalidLines.push({line: index + 1, content: line});
  }
});

if (invalidLines.length > 0) {
  console.log('❌ Found invalid base64 content lines:');
  invalidLines.forEach(invalid => {
    console.log(`  Line ${invalid.line}: ${JSON.stringify(invalid.content)}`);
  });
} else {
  console.log('✅ All content lines appear to be valid base64');
}

// Calculate expected length for RSA private key
const contentLength = contentLines.join('').length;
console.log('Total content length (base64):', contentLength);

// For RSA 2048-bit private key, base64 encoded content should be around 1700-1800 characters
if (contentLength < 1600) {
  console.log('❌ Content appears to be too short for a valid RSA private key');
} else if (contentLength > 2000) {
  console.log('⚠️  Content appears to be unusually long');
} else {
  console.log('✅ Content length appears reasonable for RSA private key');
}

// Try to decode base64 content to check if it's valid
try {
  const buffer = Buffer.from(contentLines.join(''), 'base64');
  console.log('Base64 decoding successful, decoded length:', buffer.length);
  
  // For RSA 2048-bit key, DER encoded should be around 1190-1220 bytes
  if (buffer.length < 1000) {
    console.log('❌ Decoded content too small for RSA private key');
  } else {
    console.log('✅ Decoded content size looks reasonable');
  }
} catch (error) {
  console.log('❌ Base64 decoding failed:', error.message);
}

// Save the clean key to a temporary file for manual inspection
try {
  fs.writeFileSync('temp_private_key.pem', cleanKey);
  console.log('\n✅ Clean key saved to temp_private_key.pem for manual inspection');
} catch (error) {
  console.log('❌ Failed to save temp file:', error.message);
}