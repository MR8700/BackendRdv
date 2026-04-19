'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { log, NODE_ENV } = require('../config/env');
const { v4: uuid } = require('uuid');

const LOG_DIR = log.dir;

// Ensure log dir exists
const fs = require('fs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Request correlation ID helper
let requestId = null;
function getRequestId() {
  return requestId || uuid();
}
function setRequestId(reqId) {
  requestId = reqId;
}

// Production JSON format
const productionFormat = winston.format((info) => {
  info.timestamp = new Date().toISOString();
  info.requestId = getRequestId();
  info.level = info.level.toUpperCase();
  info.environment = NODE_ENV;
  return info;
});

// Winston logger instance
const logger = winston.createLogger({
  level: log.level,
  format: winston.format.combine(
    productionFormat(),
    NODE_ENV === 'production' ? winston.format.json() : winston.format.simple()
  ),
  defaultMeta: { service: 'clinique-api' },
  transports: [
    // Daily rotation combined logs
    new DailyRotateFile({
      filename: `${LOG_DIR}/app-combined-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        productionFormat(),
        winston.format.json()
      )
    }),
    // Access logs rotation
    new DailyRotateFile({
      filename: `${LOG_DIR}/access-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    }),
    // Console (JSON prod, human-readable dev)
    new winston.transports.Console({
      format: NODE_ENV === 'production' 
        ? winston.format.combine(productionFormat(), winston.format.json())
        : winston.format.combine(productionFormat(), winston.format.colorize(), winston.format.simple())
    })
  ]
});

// Morgan stream for HTTP access logs
const accessLogStream = {
  write: (message) => logger.http(message.trim())
};

// Export
module.exports = {
  logger,
  accessLogStream,
  morganFormat: NODE_ENV === 'production' ? 'combined' : 'dev',
  getRequestId,
  setRequestId,
  LOG_DIR
};

