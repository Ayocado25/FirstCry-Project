'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query, withTransaction } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');
const { success } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Generate a signed JWT access token (short-lived)
 */
function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
}

/**
 * Generate a secure random refresh token and store its hash in DB
 */
async function generateRefreshToken(userId, client = null) {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const q = client ? client.query.bind(client) : query;
  await q(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );

  return rawToken; // Return raw (never stored), hash is in DB
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await query(
      `SELECT id, email, password_hash, full_name, role, is_active
       FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );

    const user = result.rows[0];

    // Use constant-time compare to prevent timing attacks
    const dummyHash = '$2b$12$invalid.hash.that.will.always.fail.xxxxxxxxxxxxxxxxxx';
    const hashToCompare = user ? user.password_hash : dummyHash;
    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatch) {
      throw new ApiError(401, 'Invalid email or password.');
    }

    if (!user.is_active) {
      throw new ApiError(403, 'Your account has been disabled. Contact your administrator.');
    }

    // Issue tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user.id);

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    logger.info(`User logged in: ${email} (${user.role})`);

    return success(res, {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes in seconds
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 */
async function refreshToken(req, res, next) {
  try {
    const { refresh_token: rawToken } = req.body;

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Find and validate the stored token
    const result = await query(
      `SELECT rt.*, u.id as uid, u.email, u.full_name, u.role, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()
         AND u.deleted_at IS NULL`,
      [tokenHash]
    );

    if (!result.rows.length) {
      throw new ApiError(401, 'Invalid or expired refresh token.');
    }

    const stored = result.rows[0];

    if (!stored.is_active) {
      throw new ApiError(403, 'Account is disabled.');
    }

    // Rotate: revoke old token, issue new pair
    await withTransaction(async (client) => {
      await client.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1',
        [stored.id]
      );

      const user = { id: stored.uid, email: stored.email, role: stored.role };
      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = await generateRefreshToken(user.id, client);

      return success(res, {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        token_type: 'Bearer',
        expires_in: 900,
      });
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    const { refresh_token: rawToken } = req.body;

    if (rawToken) {
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      await query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
        [tokenHash]
      );
    }

    return success(res, null, 200, 'Logged out successfully.');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.profile_photo, u.last_login_at,
              s.employee_id, s.designation
       FROM users u
       LEFT JOIN staff s ON s.user_id = u.id AND s.deleted_at IS NULL
       WHERE u.id = $1`,
      [req.user.id]
    );

    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/auth/change-password
 */
async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;

    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const match = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!match) {
      throw new ApiError(400, 'Current password is incorrect.');
    }

    const newHash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    // Revoke all existing refresh tokens (force re-login on all devices)
    await query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [req.user.id]
    );

    return success(res, null, 200, 'Password updated. Please log in again.');
  } catch (err) {
    next(err);
  }
}

module.exports = { login, refreshToken, logout, getMe, changePassword };
