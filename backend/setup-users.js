const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'sppa_db',
    password: process.env.DB_PASSWORD || '12345678', // Ganti dengan kata sandi PostgreSQL Anda
    port: process.env.DB_PORT || 5417,
});

async function hashPassword(plainPassword) {
    const saltRounds = 10;
    return await bcrypt.hash(plainPassword, saltRounds);
}

async function createUser(username, password) {
    try {
        const hashedPassword = await hashPassword(password);
        
        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        
        if (existingUser.rows.length > 0) {
            console.log(`User '${username}' already exists. Updating password...`);
            await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hashedPassword, username]);
            console.log(`Password updated for user '${username}'`);
        } else {
            console.log(`Creating new user '${username}'...`);
            await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
            console.log(`User '${username}' created successfully`);
        }
        
        return { username, hashedPassword };
    } catch (error) {
        console.error('Error creating/updating user:', error);
        throw error;
    }
}

async function main() {
    try {
        console.log('Setting up users for authentication...\n');
        
        // Create default admin user
        await createUser('admin', 'admin123');
        
        // Create additional test user
        await createUser('user', 'user123');
        
        console.log('\nUser setup completed!');
        console.log('You can now login with:');
        console.log('- Username: admin, Password: admin123');
        console.log('- Username: user, Password: user123');
        console.log('\nPlease change these default passwords in production!');
        
    } catch (error) {
        console.error('Failed to setup users:', error);
    } finally {
        await pool.end();
    }
}

// If script is run directly
if (require.main === module) {
    main();
}

module.exports = { hashPassword, createUser };
