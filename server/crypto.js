'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SCRYPT_PARAMS = Object.freeze({
  N: 32768,
  r: 8,
  p: 1,
  keylen: 64,
  maxmem: 64 * 1024 * 1024
});

const MASTER_KEY_BYTES = 32;
const DEK_BYTES = 32;
const IV_BYTES = 12;
const SALT_BYTES = 16;

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadOrCreateMasterKey(filePath, options = {}) {
  ensureParent(filePath);

  try {
    const key = fs.readFileSync(filePath);
    if (key.length !== MASTER_KEY_BYTES) {
      throw new Error(
        `Master key file is invalid: expected ${MASTER_KEY_BYTES} bytes, got ${key.length}. ` +
        'Restore the correct master key or the notes cannot be decrypted.'
      );
    }
    return key;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (options.dbPath && fs.existsSync(options.dbPath)) {
    const stat = fs.statSync(options.dbPath);
    if (stat.size > 0) {
      throw new Error(
        `The database exists at ${options.dbPath} but the master key is missing at ${filePath}. ` +
        'Refusing to generate a new key because it would make the existing notes unreadable. ' +
        'Restore the original master key from your backup.'
      );
    }
  }

  const key = crypto.randomBytes(MASTER_KEY_BYTES);
  try {
    fs.writeFileSync(filePath, key, { mode: 0o600, flag: 'wx' });
    return key;
  } catch (error) {
    if (error.code === 'EEXIST') {
      const existing = fs.readFileSync(filePath);
      if (existing.length !== MASTER_KEY_BYTES) {
        throw new Error('Master key file was created by another process but is invalid.');
      }
      return existing;
    }
    throw error;
  }
}

function scrypt(password, salt, params) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(
      String(password),
      salt,
      params.keylen,
      { N: params.N, r: params.r, p: params.p, maxmem: params.maxmem },
      (error, derived) => {
        if (error) reject(error);
        else resolve(derived);
      }
    );
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const hash = await scrypt(password, salt, SCRYPT_PARAMS);
  return {
    hash,
    salt,
    params: {
      N: SCRYPT_PARAMS.N,
      r: SCRYPT_PARAMS.r,
      p: SCRYPT_PARAMS.p,
      keylen: SCRYPT_PARAMS.keylen
    }
  };
}

function parseParams(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function verifyPassword(password, storedHash, storedSalt, storedParams) {
  const params = parseParams(storedParams);
  if (!params || !storedHash || !storedSalt) return false;

  const hash = Buffer.from(storedHash);
  const salt = Buffer.from(storedSalt);
  if (!Number.isInteger(params.keylen) || params.keylen <= 0) return false;

  try {
    const derived = await scrypt(password, salt, {
      N: Number(params.N),
      r: Number(params.r),
      p: Number(params.p),
      keylen: Number(params.keylen),
      maxmem: SCRYPT_PARAMS.maxmem
    });
    return derived.length === hash.length && crypto.timingSafeEqual(derived, hash);
  } catch {
    return false;
  }
}

function needsRehash(storedParams) {
  const params = parseParams(storedParams);
  if (!params) return true;
  return (
    Number(params.N) !== SCRYPT_PARAMS.N ||
    Number(params.r) !== SCRYPT_PARAMS.r ||
    Number(params.p) !== SCRYPT_PARAMS.p ||
    Number(params.keylen) !== SCRYPT_PARAMS.keylen
  );
}

function encryptBuffer(plaintext, key, aad) {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(String(aad), 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    ciphertext,
    iv,
    tag: cipher.getAuthTag()
  };
}

function decryptBuffer(ciphertext, iv, tag, key, aad) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(String(aad), 'utf8'));
  decipher.setAuthTag(Buffer.from(tag));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext)), decipher.final()]);
}

function encryptText(value, key, aad) {
  return encryptBuffer(Buffer.from(String(value == null ? '' : value), 'utf8'), key, aad);
}

function decryptText(ciphertext, iv, tag, key, aad) {
  return decryptBuffer(ciphertext, iv, tag, key, aad).toString('utf8');
}

function wrapUserKey(dek, masterKey, userId) {
  return encryptBuffer(dek, masterKey, `user-key:${userId}`);
}

function unwrapUserKey(wrapped, masterKey, userId) {
  return decryptBuffer(
    wrapped.ciphertext,
    wrapped.iv,
    wrapped.tag,
    masterKey,
    `user-key:${userId}`
  );
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function randomId() {
  return crypto.randomUUID();
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

module.exports = {
  SCRYPT_PARAMS,
  MASTER_KEY_BYTES,
  DEK_BYTES,
  loadOrCreateMasterKey,
  hashPassword,
  verifyPassword,
  needsRehash,
  encryptBuffer,
  decryptBuffer,
  encryptText,
  decryptText,
  wrapUserKey,
  unwrapUserKey,
  randomToken,
  randomId,
  sha256Hex,
  safeEqual
};
