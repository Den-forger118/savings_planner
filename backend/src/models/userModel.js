const pool = require('../dbcon');

// creating a new user
const createUser = async (firstname, lastname, email, passwordHash) => {
    const query = `INSERT INTO users (first_name, last_name, email, passwordhash)
                   VALUES ($1, $2, $3, $4) 
                   RETURNING user_id, first_name, last_name, email, created_at`;

try { 
    const result = await pool.query(query, [firstname, lastname, email, passwordHash]);
    return result.rows[0];
}catch (error) {
    console.error('Error creating user:', error);
    throw error;
}
};

// get user by id
const getUserById = async (userId) => {
  const query = 'SELECT user_id, first_name, last_name, email, created_at FROM users WHERE user_id = $1';
  
  try {
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  } catch (err) {
    throw new Error(`Error fetching user: ${err.message}`);
  }
};

// get user by email
const getUserByEmail = async (email) => {
  const query = 'SELECT * FROM users WHERE email = $1'; 

    try {
        const result = await pool.query(query, [email]);
        return result.rows[0];
    } catch (err) {
        throw new Error(`Error fetching user: ${err.message}`);
    }
}

module.exports = {
    createUser,
    getUserById,
    getUserByEmail
};