const { Pool } = require('pg');
require('dotenv').config();

// Managed Postgres (Railway, Render, Supabase) requires SSL; local Docker does not.
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = (process.env.DATABASE_URL || '').trim();
const needsSsl =
  isProduction ||
  /railway|rlwy|render\.com|supabase\.co|pooler\.supabase/i.test(databaseUrl);

// Prefer DATABASE_URL (Railway / Supabase). Fall back to DB_* (Docker / manual).
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: needsSsl ? { rejectUnauthorized: false } : false,
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
