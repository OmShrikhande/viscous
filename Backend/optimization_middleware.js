/**
 * Performance Optimization Middleware
 * Apply these optimizations for better performance with 500+ users
 */

const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const NodeCache = require('node-cache');

// Initialize cache with 5-minute TTL
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Basic Security and Performance Middleware
 */
function setupBasicMiddleware(app) {
    // Helmet for security headers
    app.use(helmet({
        contentSecurityPolicy: false // Disable CSP for Firebase compatibility
    }));
    
    // Compression for response size reduction
    app.use(compression({
        level: 6, // Good balance between compression ratio and CPU usage
        threshold: 1024, // Only compress responses > 1KB
        filter: (req, res) => {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression.filter(req, res);
        }
    }));
}

/**
 * Rate Limiting Middleware
 */
function setupRateLimiting(app) {
    // General API rate limiting
    const generalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: {
            error: 'Too many requests from this IP, please try again later.',
            retryAfter: 15 * 60 // 15 minutes in seconds
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
    
    // Strict rate limiting for data upload endpoints
    const uploadLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 30, // Limit to 30 uploads per minute
        message: {
            error: 'Upload rate limit exceeded, please slow down.',
            retryAfter: 60
        }
    });
    
    // Slow down middleware for progressive delays
    const speedLimiter = slowDown({
        windowMs: 15 * 60 * 1000, // 15 minutes
        delayAfter: 50, // Allow 50 requests per 15 minutes at full speed
        delayMs: 500, // Add 500ms delay per request after delayAfter
        maxDelayMs: 20000, // Maximum delay of 20 seconds
    });
    
    // Apply middleware
    app.use('/api/', generalLimiter);
    app.use('/esp8266/upload', uploadLimiter);
    app.use('/tracking/api/', speedLimiter);
}

/**
 * Caching Middleware
 */
function createCacheMiddleware(duration = 300) {
    return (req, res, next) => {
        // Skip caching for POST, PUT, DELETE requests
        if (req.method !== 'GET') {
            return next();
        }
        
        const key = req.originalUrl || req.url;
        const cachedResponse = cache.get(key);
        
        if (cachedResponse) {
            console.log(`[Cache] Hit for ${key}`);
            return res.json(cachedResponse);
        }
        
        // Store original res.json function
        const originalJson = res.json;
        
        // Override res.json to cache the response
        res.json = function(data) {
            // Cache successful responses only
            if (res.statusCode === 200) {
                cache.set(key, data, duration);
                console.log(`[Cache] Stored for ${key}`);
            }
            
            // Call original json method
            originalJson.call(this, data);
        };
        
        next();
    };
}

/**
 * Firestore Query Optimization Helper
 */
class FirestoreOptimizer {
    constructor() {
        this.queryCache = new NodeCache({ stdTTL: 60, checkperiod: 10 }); // 1-minute cache for queries
    }
    
    /**
     * Cached Firestore query execution
     */
    async cachedQuery(cacheKey, queryFunction, cacheDuration = 60) {
        const cached = this.queryCache.get(cacheKey);
        if (cached) {
            console.log(`[Firestore Cache] Hit for ${cacheKey}`);
            return cached;
        }
        
        try {
            const result = await queryFunction();
            this.queryCache.set(cacheKey, result, cacheDuration);
            console.log(`[Firestore Cache] Stored for ${cacheKey}`);
            return result;
        } catch (error) {
            console.error(`[Firestore Cache] Error for ${cacheKey}:`, error);
            throw error;
        }
    }
    
    /**
     * Batch Firestore operations
     */
    async batchWrite(db, operations) {
        const batch = db.batch();
        
        operations.forEach(operation => {
            const { type, ref, data } = operation;
            
            switch(type) {
                case 'set':
                    batch.set(ref, data);
                    break;
                case 'update':
                    batch.update(ref, data);
                    break;
                case 'delete':
                    batch.delete(ref);
                    break;
            }
        });
        
        return await batch.commit();
    }
}

/**
 * Performance Monitoring Middleware
 */
function performanceMonitor(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = duration > 1000 ? 'WARN' : 'INFO';
        
        console.log(`[${logLevel}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
        
        // Log slow requests
        if (duration > 5000) {
            console.warn(`[SLOW REQUEST] ${req.method} ${req.originalUrl} took ${duration}ms`);
        }
    });
    
    next();
}

/**
 * Memory Usage Monitor
 */
function memoryMonitor() {
    setInterval(() => {
        const usage = process.memoryUsage();
        const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
        const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
        
        console.log(`[Memory] Used: ${usedMB}MB, Total: ${totalMB}MB`);
        
        // Warn if memory usage is high
        if (usedMB > 400) { // 400MB threshold for 512MB limit
            console.warn(`[Memory WARNING] High memory usage: ${usedMB}MB`);
        }
    }, 60000); // Check every minute
}

/**
 * Setup all optimizations
 */
function setupOptimizations(app, db) {
    console.log('🚀 Setting up performance optimizations...');
    
    // Basic middleware
    setupBasicMiddleware(app);
    
    // Rate limiting
    setupRateLimiting(app);
    
    // Performance monitoring
    app.use(performanceMonitor);
    
    // Start memory monitoring
    memoryMonitor();
    
    // Create Firestore optimizer instance
    const firestoreOptimizer = new FirestoreOptimizer();
    
    console.log('✅ Performance optimizations applied');
    
    return {
        cache,
        firestoreOptimizer,
        cacheMiddleware: createCacheMiddleware
    };
}

module.exports = {
    setupOptimizations,
    createCacheMiddleware,
    FirestoreOptimizer,
    performanceMonitor,
    memoryMonitor
};