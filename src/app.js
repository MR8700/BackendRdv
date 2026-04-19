'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

const { PORT, API_PREFIX, cors: corsCfg, NODE_ENV, log, render } = require('./config/env');
const { connectDB } = require('./config/database');
const { verifyMailer } = require('./config/mailer');
const { accessLogStream, morganFormat, logger } = require('./utils/prodLogger');
const { startScheduler } = require('./jobs/scheduler');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const { notFound, errorHandler } = require('./middlewares/errorHandler.middleware');

const app = express();
let server;

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'script-src': ["'self'", "'unsafe-inline'"],
      'style-src': ["'self'", "'unsafe-inline'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

app.use(cors({
  origin: corsCfg.origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

app.use(morgan(morganFormat, {
  stream: NODE_ENV === 'production' ? accessLogStream : process.stdout,
}));

const uploadsPath = NODE_ENV === 'production' ? render.diskPath : 'uploads';
app.use('/uploads', express.static(uploadsPath));
app.use(API_PREFIX, apiLimiter);

app.get(`${API_PREFIX}/health`, async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ 
      success: true, 
      message: 'API OK', 
      env: NODE_ENV,
      db: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(503).json({ success: false, message: 'DB down' });
  }
});

app.get(`${API_PREFIX}`, (_req, res) => {
  res.json({
    success: true,
    message: 'Clinique API Production Ready',
    version: '1.0.0',
    docs: `${API_PREFIX}/endpoints`,
  });
});

app.get(`${API_PREFIX}/endpoints`, (_req, res) => {
  res.json({
    success: true,
    endpoints: {
      auth: ['POST /auth/login', 'POST /auth/register', 'POST /auth/refresh'],
      users: ['GET /utilisateurs', 'POST /utilisateurs'],
      rdv: ['POST /rendez-vous', 'GET /rendez-vous/:id'],
      clinic: ['PUT /clinique/logo'],
    },
  });
});

const routes = require('./routes/index');
app.use(API_PREFIX, routes);

app.use(notFound);
app.use(errorHandler);

async function bootstrap() {
  try {
    await connectDB();
    logger.info('Database connected');

    // Load models AFTER DB connection (safe for Render)
    require('./models/index');
    logger.info('Models loaded');

    await verifyMailer();
    await startScheduler();
    
    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server listening on port ${PORT}${API_PREFIX}`, {
        pid: process.pid,
        env: NODE_ENV
      });
    });
  } catch (err) {
    logger.error('Bootstrap failed', err);
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.warn(`Shutdown signal ${signal}`);
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => logger.error('Uncaught', err) || process.exit(1));
process.on('unhandledRejection', (reason) => logger.error('Unhandled', reason) || process.exit(1));

if (NODE_ENV !== 'test') {
  bootstrap();
}

module.exports = app;

