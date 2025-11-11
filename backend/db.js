const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'sppa_db',
    password: process.env.DB_PASSWORD || '12345678', // Ganti dengan kata sandi PostgreSQL Anda
    port: process.env.DB_PORT || 5417,
});

module.exports = pool;