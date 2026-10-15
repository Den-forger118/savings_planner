const pool = require('../dbcon');

/**
 * Ensure ADMIN_PROMOTE_EMAIL is admin (and demote other env-promoted accounts).
 * Safe to call on migrate, register, and login.
 * @returns {Promise<object|null>} updated user row when email matched, else null
 */
async function syncAdminPromoteEmail(email) {
  const promoteEmail = process.env.ADMIN_PROMOTE_EMAIL?.trim();
  if (!promoteEmail) return null;

  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || normalized !== promoteEmail.toLowerCase()) {
    return null;
  }

  const promoted = await pool.query(
    `UPDATE users SET is_admin = true WHERE LOWER(email) = LOWER($1)
     RETURNING *`,
    [promoteEmail]
  );

  await pool.query(
    `UPDATE users
       SET is_admin = false
     WHERE is_admin = true
       AND LOWER(email) <> LOWER($1)`,
    [promoteEmail]
  );

  return promoted.rows[0] || null;
}

/** Full sync used on startup: promote env email even if we only know the env var. */
async function syncAdminPromoteOnStartup() {
  const promoteEmail = process.env.ADMIN_PROMOTE_EMAIL?.trim();
  if (!promoteEmail) return;

  const promoted = await pool.query(
    `UPDATE users SET is_admin = true WHERE LOWER(email) = LOWER($1) RETURNING email`,
    [promoteEmail]
  );

  const demoted = await pool.query(
    `UPDATE users
       SET is_admin = false
     WHERE is_admin = true
       AND LOWER(email) <> LOWER($1)
     RETURNING email`,
    [promoteEmail]
  );

  if (promoted.rowCount === 0) {
    console.warn(
      `[admin] ADMIN_PROMOTE_EMAIL="${promoteEmail}" matched no user. `
        + 'Register/login with that email, or wait until the account exists.'
    );
    return;
  }

  console.log(`[admin] Promoted admin: ${promoteEmail}`);
  if (demoted.rowCount > 0) {
    console.log(
      `[admin] Demoted previous admin(s): ${demoted.rows.map((row) => row.email).join(', ')}`
    );
  }
}

module.exports = {
  syncAdminPromoteEmail,
  syncAdminPromoteOnStartup,
};
