'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');

const { PORT, API_PREFIX, cors: corsCfg, NODE_ENV } = require('./config/env');
const { connectDB } = require('./config/database');
const logger = require('./utils/prodLogger');
const { startScheduler } = require('./jobs/scheduler');
const { apiLimiter } = require('./middlewares/rateLimiter.middleware');
const { notFound, errorHandler } = require('./middlewares/errorHandler.middleware');

const app = express();
let server;

const PORT_NUM = parseInt(PORT, 10) || 10000;
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend RDV API is running 🚀',
    version: '1.0.0',
    time: new Date().toISOString(),
  });
});

app.use(helmet({
  contentSecurityPolicy: false, // Disable warnings
  hsts: NODE_ENV === 'production'
}));

app.use(cors({
  origin: corsCfg.origins,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

app.use(morgan('combined', {
  skip: (req) => req.url === '/health'
}));

app.use(API_PREFIX, apiLimiter);

app.get(`${API_PREFIX}/health`, async (req, res) => {
  try {
    res.json({ 
      success: true, 
      env: NODE_ENV,
      timestamp: new Date().toISOString(),
      port: PORT_NUM
    });
  } catch (err) {
    res.status(500).json({ error: 'health check failed' });
  }
});

const routes = require('./routes/index');
app.use(API_PREFIX, routes);

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  try {
    console.log('Starting server...');
    
    server = app.listen(PORT_NUM, '0.0.0.0', () => {
      console.log(`Server listening on port ${PORT_NUM}`);
      console.log('Health: http://localhost:' + PORT_NUM + API_PREFIX + '/health');
    });
  } catch (err) {
    console.error('Server start failed:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  if (server) server.close(() => process.exit(0));
});

if (NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;

