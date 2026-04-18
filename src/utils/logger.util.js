'use strict';

const fs   = require('fs');
const path = require('path');
const { log, NODE_ENV } = require('../config/env');

// Créer le dossier logs si absent
if (!fs.existsSync(log.dir)) fs.mkdirSync(log.dir, { recursive: true });

// Stream fichier pour Morgan (accès HTTP)
const accessLogStream = fs.createWriteStream(
  path.join(log.dir, 'access.log'),
  { flags: 'a' }
);

// Logger applicatif léger (sans dépendance winston pour simplifier)
const logger = {
  info  : (...args) => console.log(`[INFO]`, ...args),
  warn  : (...args) => console.warn(`[WARN]`, ...args),
  error : (...args) => console.error(`[ERROR]`, ...args),
  debug : (...args) => { if (NODE_ENV === 'development') console.log(`[DEBUG]`, ...args); },
};

// Format Morgan : 'dev' en développement, 'combined' en production
const morganFormat = NODE_ENV === 'production' ? 'combined' : 'dev';

module.exports = { logger, accessLogStream, morganFormat };