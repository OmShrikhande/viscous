#!/usr/bin/env node

/**
 * Keep-Alive Script for Render Deployment
 * 
 * This script pings your server every 14 minutes to prevent Render's free tier
 * from spinning down your service due to inactivity.
 * 
 * Usage:
 * 1. Set your server URL: export SERVER_URL="https://your-service.onrender.com"
 * 2. Run the script: node keep-alive.js
 */

const https = require('https');
const http = require('http');
const url = require('url');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'https://your-service-name.onrender.com';
const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes in milliseconds
const PING_TIMEOUT = 10000; // 10 seconds timeout

console.log('🚀 Keep-Alive Script Started');
console.log(`🎯 Target Server: ${SERVER_URL}`);
console.log(`⏰ Ping Interval: 14 minutes`);
console.log(`🔄 Starting ping cycle...\n`);

function pingServer() {
  const startTime = Date.now();
  const pingUrl = `${SERVER_URL}/health`;
  
  try {
    const parsedUrl = url.parse(pingUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = protocol.get(parsedUrl, (res) => {
      const responseTime = Date.now() - startTime;
      const timestamp = new Date().toISOString();
      
      if (res.statusCode === 200) {
        console.log(`✅ [${timestamp}] Ping successful - Response: ${res.statusCode} (${responseTime}ms)`);
        
        // Read response body for additional info
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const responseData = JSON.parse(data);
            if (responseData.uptime) {
              console.log(`   Server uptime: ${responseData.uptime}`);
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        });
      } else {
        console.log(`⚠️  [${timestamp}] Ping returned status: ${res.statusCode} (${responseTime}ms)`);
      }
    });
    
    req.on('error', (error) => {
      const timestamp = new Date().toISOString();
      console.log(`❌ [${timestamp}] Ping failed: ${error.message}`);
    });
    
    req.setTimeout(PING_TIMEOUT, () => {
      req.destroy();
      const timestamp = new Date().toISOString();
      console.log(`⏰ [${timestamp}] Ping timeout after ${PING_TIMEOUT}ms`);
    });
    
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.log(`❌ [${timestamp}] Ping error: ${error.message}`);
  }
}

// Perform initial ping
console.log('🔄 Performing initial ping...');
pingServer();

// Set up recurring pings
const pingInterval = setInterval(() => {
  console.log('\n🔄 Performing scheduled ping...');
  pingServer();
  
  const nextPing = new Date(Date.now() + PING_INTERVAL);
  console.log(`⏭️  Next ping scheduled at: ${nextPing.toLocaleString()}`);
}, PING_INTERVAL);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down keep-alive script...');
  clearInterval(pingInterval);
  console.log('✅ Keep-alive script stopped');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  clearInterval(pingInterval);
  process.exit(0);
});

// Next ping scheduling disabled
// const nextPing = new Date(Date.now() + PING_INTERVAL);
// console.log(`⏭️  Next ping scheduled at: ${nextPing.toLocaleString()}`);