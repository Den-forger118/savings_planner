const pool = require('../dbcon');

async function createPayout({
  userId,
  amount,
  currency,
  paystackRef,
  recipientCode,
  recipientType,
  accountNumber,
  bankCode,
  accountName,
}) {
  const result = await pool.query(
    `
      INSERT INTO payouts (
        user_id, amount, currency, status, paystack_ref,
        recipient_code, recipient_type, account_number, bank_code, account_name
      )
      VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [
      userId,
      amount,
      currency,
      paystackRef,
      recipientCode,
      recipientType,
      accountNumber,
      bankCode,
      accountName,
    ]
  );
  return result.rows[0];
}

async function getByReference(paystackRef) {
  const result = await pool.query(
    `SELECT * FROM payouts WHERE paystack_ref = $1`,
    [paystackRef]
  );
  return result.rows[0] || null;
}

async function getById(payoutId) {
  const result = await pool.query(
    `SELECT * FROM payouts WHERE payout_id = $1`,
    [payoutId]
  );
  return result.rows[0] || null;
}

async function listForUser(userId, { limit = 20 } = {}) {
  const result = await pool.query(
    `
      SELECT *
      FROM payouts
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [userId, limit]
  );
  return result.rows;
}

async function markProcessing({
  paystackRef,
  transferCode = null,
  journalEntryId = null,
}) {
  const result = await pool.query(
    `
      UPDATE payouts
      SET status = 'processing',
          transfer_code = COALESCE($2, transfer_code),
          journal_entry_id = COALESCE($3, journal_entry_id)
      WHERE paystack_ref = $1
        AND status IN ('pending', 'processing')
      RETURNING *
    `,
    [paystackRef, transferCode, journalEntryId]
  );
  return result.rows[0] || null;
}

async function markSuccess({ paystackRef, finalizeJournalEntryId = null, transferCode = null }) {
  const result = await pool.query(
    `
      UPDATE payouts
      SET status = 'success',
          transfer_code = COALESCE($2, transfer_code),
          finalize_journal_entry_id = COALESCE($3, finalize_journal_entry_id),
          completed_at = NOW()
      WHERE paystack_ref = $1
        AND status IN ('pending', 'processing')
      RETURNING *
    `,
    [paystackRef, transferCode, finalizeJournalEntryId]
  );
  return result.rows[0] || null;
}

async function markFailed({
  paystackRef,
  failureReason = null,
  finalizeJournalEntryId = null,
}) {
  const result = await pool.query(
    `
      UPDATE payouts
      SET status = 'failed',
          failure_reason = COALESCE($2, failure_reason),
          finalize_journal_entry_id = COALESCE($3, finalize_journal_entry_id),
          completed_at = NOW()
      WHERE paystack_ref = $1
        AND status IN ('pending', 'processing')
      RETURNING *
    `,
    [paystackRef, failureReason, finalizeJournalEntryId]
  );
  return result.rows[0] || null;
}

module.exports = {
  createPayout,
  getByReference,
  getById,
  listForUser,
  markProcessing,
  markSuccess,
  markFailed,
};
