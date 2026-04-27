const {Pool} = require('pg');
require('dotenv').config();

//creating a connection pool to the database
const pool = new Pool({
    user: process.env.DB_USERNAME,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

//test the connection
pool.on('connect',() => {
     console.log('Connected to the database successfully!(postgreSQL)');
});

pool.on('error', (err)=>{
    console.error('Error connecting to the database', err);
});

module.exports = pool;