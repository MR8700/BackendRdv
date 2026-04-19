'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const { body } = require('express-validator');
const clsHooked = require('cls-hooked'); // Request context

const { PORT, API_PREFIX, cors: corsCfg, NODE_ENV, log, render } = require('./config/env');
const { connectDB } = require('./config/database');
const { verifyMailer } = require('./config/mailer');
const { accessLogStream, morganFormat, logger, setRequestId } = require('./utils/prodLogger.js');
const { startScheduler } = require('./jobs/scheduler');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const { notFound, errorHandler } = require('./middlewares/errorHandler.middleware');

const app = express();
let server;

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      'style-src': ["'self'", "'unsafe-inline'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  permissionsPolicy: {
    accelerometer: [],
    camera: [],
    geolocation: [],
    gyroscope: [],
    magnetometer: [],
    microphone: [],
    payment: [],
    usb: [],
  },
})); 
app.use(
  cors({
    origin: corsCfg.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Request ID middleware
app.use(require('./middlewares/requestId.middleware'));

// Global sanitize (xss protection)
app.use((req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = require('xss')(req.body[key]);
      }
    });
  }
  next();
});

app.use(
  morgan(morganFormat, {
    stream: NODE_ENV === 'production' ? accessLogStream : process.stdout,
  })
);

// Dynamic uploads path for Render Disks
const uploadsPath = NODE_ENV === 'production' ? render.diskPath : 'uploads';
app.use('/uploads', express.static(uploadsPath));
app.use(API_PREFIX, apiLimiter);

app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.json({ success: true, message: 'API operationnelle', env: NODE_ENV });
});

app.get(`${API_PREFIX}`, (_req, res) => {
  res.json({
    success: true,
    message: 'Bienvenue sur l API Clinique',
    docs: `${API_PREFIX}/endpoints`,
  });
});

app.get(`${API_PREFIX}/endpoints`, (_req, res) => {
  res.json({
    success: true,
    endpoints: {
      auth: ['/auth/login', '/auth/register', '/auth/refresh', '/auth/me'],
      users: ['/utilisateurs', '/users'],
      doctors: ['/medecins', '/doctors'],
      patients: ['/patients', '/clients'],
      appointments: ['/rendez-vous', '/appointments'],
      availability: ['/disponibilites', '/availability'],
      clinic: ['/clinique', '/clinic'],
      services: ['/services'],
      notifications: ['/notifications'],
      logs: ['/audit-logs', '/logs'],
      jobs: ['/system-jobs', '/jobs'],
    },
  });
});

const routes = require('./routes/index');
app.use(API_PREFIX, routes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDB();
  await verifyMailer();
  startScheduler();
  server = app.listen(PORT, () => {
    logger.info(`Serveur demarre sur http://localhost:${PORT}${API_PREFIX}`);
    logger.info(`Environnement : ${NODE_ENV}`);
  });
}

async function shutdown(signal) {
  logger.warn(`[APP] Signal ${signal} recu, arret en cours...`);

  if (!server) {
    process.exit(0);
    return;
  }

  server.close((err) => {
    if (err) {
      logger.error('[APP] Erreur pendant la fermeture du serveur :', err);
      process.exit(1);
      return;
    }

    process.exit(0);
  });
}

process.on('SIGINT', () => {
  shutdown('SIGINT').catch((err) => {
    logger.error('[APP] Echec de l arret SIGINT :', err);
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch((err) => {
    logger.error('[APP] Echec de l arret SIGTERM :', err);
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  logger.error('[APP] uncaughtException :', err);
});

process.on('unhandledRejection', (reason) => {
  logger.error('[APP] unhandledRejection :', reason);
});

if (NODE_ENV !== 'test') {
  start();
}

module.exports = app;
