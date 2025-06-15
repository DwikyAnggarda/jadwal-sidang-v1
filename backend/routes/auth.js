const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const { generateToken, verifyToken } = require('../utils/jwt');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Database connection (use same config as main server)
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'sppa_db',
    password: process.env.DB_PASSWORD ||  '12345678', // Ganti dengan kata sandi PostgreSQL Anda
    port: process.env.DB_PORT || 5417,
});

// Rate limiting for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        success: false,
        message: 'Too many login attempts, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * POST /auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Find user in database
        const userQuery = 'SELECT id, username, password FROM users WHERE username = $1';
        const userResult = await pool.query(userQuery, [username]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        const user = userResult.rows[0];

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Generate JWT token
        const token = generateToken({
            id: user.id,
            username: user.username
        });

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

/**
 * POST /auth/logout
 * Logout user (client should remove token)
 */
router.post('/logout', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

/**
 * GET /auth/verify
 * Verify if current token is valid
 */
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid',
        user: {
            id: req.user.id,
            username: req.user.username
        }
    });
});

/**
 * GET /auth/me
 * Get current user information
 */
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userQuery = 'SELECT id, username FROM users WHERE id = $1';
        const userResult = await pool.query(userQuery, [req.user.id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userResult.rows[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
