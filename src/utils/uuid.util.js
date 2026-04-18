'use strict';

const { randomUUID } = require('crypto');

const generateDossierId = () => `DMI-${randomUUID().toUpperCase()}`;
const generateUuid = () => randomUUID();

module.exports = { generateDossierId, generateUuid };
