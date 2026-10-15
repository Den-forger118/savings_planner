const { Pool } = require('pg');
require('dotenv').config();

// Railway Postgres requires SSL; local Docker does not.
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = (process.env.DATABASE_URL || '').trim();

// Prefer DATABASE_URL (Railway Postgres plugin). Fall back to DB_* (Docker / manual).
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: isProduction || /railway|rlwy|render\.com/i.test(databaseUrl)
        ? { rejectUnauthorized: false }
        : false,
    })
  : new Pool({
      user: process.env.DB_USERNAME,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    });

pool.on('connect', () => {
  console.log('Connected to the database successfully!(postgreSQL)');
});

pool.on('error', (err) => {
  console.error('Error connecting to the database', err);
});

module.exports = pool;
