const dotenv = require('dotenv');
dotenv.config();

console.log('=== PRIVATE KEY DEBUG ===');
console.log('Length of FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.length : 'undefined');
console.log('First 100 characters:', process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.substring(0, 100) : 'undefined');
console.log('Contains \\n sequences:', process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.includes('\\n') : false);
console.log('Contains actual newlines:', process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.includes('\n') : false);

// Test different processing methods
if (process.env.FIREBASE_PRIVATE_KEY) {
  console.log('\n=== TESTING PROCESSING METHODS ===');
  
  const originalKey = process.env.FIREBASE_PRIVATE_KEY;
  console.log('1. Original key (first 100 chars):', originalKey.substring(0, 100));
  
  const method1 = originalKey.replace(/\\n/g, '\n');
  console.log('2. Method 1 (.replace(/\\n/g, \'\\n\')) first 100 chars:', method1.substring(0, 100));
  
  // Check if key starts and ends correctly
  console.log('3. Starts with BEGIN:', originalKey.trim().startsWith('-----BEGIN'));
  console.log('4. Ends with END:', originalKey.trim().endsWith('-----'));
  
  const method2 = originalKey.replace(/\\n/g, '\n').trim();
  console.log('5. Method 2 (with trim) starts with BEGIN:', method2.startsWith('-----BEGIN'));
  console.log('6. Method 2 (with trim) ends with END:', method2.endsWith('-----'));
  
  // Show the structure
  console.log('\n=== KEY STRUCTURE ===');
  const lines = method2.split('\n');
  console.log('Number of lines after processing:', lines.length);
  console.log('First line:', lines[0]);
  console.log('Last line:', lines[lines.length - 1]);
  
  // Check if it's already properly formatted
  if (originalKey.includes('\n') && !originalKey.includes('\\n')) {
    console.log('\n=== KEY APPEARS TO ALREADY BE FORMATTED ===');
    console.log('Try using the key without processing (.replace)');
  }
}