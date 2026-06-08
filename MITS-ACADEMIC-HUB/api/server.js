/**
 * MITS Academic Hub - Backend Server
 * Production-ready Node.js/Express API
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const mongoose = require('mongoose');
const { seedDefaultAdmin } = require('./utils/seedAdmin');
const { seedDefaultSemesters } = require('./utils/seedSemesters');

const app = express();
app.set('trust proxy', 1);

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet - Set HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Data sanitization & validation
app.use(mongoSanitize());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Compression
app.use(compression());

// Logging
app.use(morgan(process.env.LOG_LEVEL === 'debug' ? 'dev' : 'combined'));

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Request ID tracking
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ===== DEBUG NETWORK ENDPOINT =====
app.get('/debug-network', (req, res) => {
  const https = require('https');
  const start = Date.now();
  const options = {
    hostname: 'iums.mitsgwalior.in',
    port: 443,
    path: '/',
    method: 'HEAD',
    timeout: 15000
  };
  const request = https.request(options, (response) => {
    res.json({ success: true, timeMs: Date.now() - start });
  });
  request.on('error', (err) => {
    res.json({ success: false, error: err.code, timeMs: Date.now() - start });
  });
  request.on('timeout', () => {
    request.destroy();
    res.json({ success: false, error: 'TIMEOUT', timeMs: Date.now() - start });
  });
  request.end();
});
// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/results', require('./routes/results'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/students', require('./routes/students'));
app.use('/api/semesters', require('./routes/semesters'));

// Frontend static files
const publicDir = path.join(__dirname, '..');
app.use(express.static(publicDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(publicDir, 'admin', 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  console.error(`[${req.id}] Error:`, {
    status,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err }),
  });
});

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✓ MongoDB connected: ${conn.connection.host}`);
    await seedDefaultAdmin();
    await seedDefaultSemesters();
    return conn;
  } catch (err) {
    console.warn('⚠ MongoDB connection failed:', err.message);
    console.warn('⚠ Running in DEMO MODE without database persistence');
    console.warn('⚠ To use MongoDB, configure MONGODB_URI in .env');
    return null;
  }
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    const PORT = process.env.PORT || 3000;
    let dbConn = null;
    const server = app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ Access: http://localhost:${PORT}`);
      console.log(`✓ Student Portal: http://localhost:${PORT}/`);
      console.log(`✓ Admin Portal: http://localhost:${PORT}/admin/`);
      console.log(`✓ API Docs: http://localhost:${PORT}/api/`);
    });

    connectDB().then((conn) => {
      dbConn = conn;
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('✓ SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        if (dbConn) mongoose.connection.close();
        process.exit(0);
      });
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Start if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;

 
 