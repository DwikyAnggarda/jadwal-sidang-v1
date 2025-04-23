const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'sppa_db',
    password: '12345678', // Ganti dengan kata sandi PostgreSQL Anda
    port: 5417,
});

module.exports = pool;