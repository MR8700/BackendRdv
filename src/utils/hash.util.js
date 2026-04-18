'use strict';

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

const hashPassword  = async (plain)         => bcrypt.hash(plain, SALT_ROUNDS);
const comparePassword = async (plain, hash) => bcrypt.compare(plain, hash);
const generateSalt   = async ()             => bcrypt.genSalt(SALT_ROUNDS);

module.exports = { hashPassword, comparePassword, generateSalt };