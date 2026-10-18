const pool = require('../dbcon');

async function createPendingPayment({
  userId,
  goalId,
  paystackRef,
  amount,
  currency,
}) {
  const result = await pool.query(
    `
      INSERT INTO payment_references (
        user_id, goal_id, paystack_ref, amount, currency, status
      )
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `,
    [userId, goalId, paystackRef, amount, currency]
  );
  return result.rows[0];
}

async function getByReference(paystackRef) {
  const result = await pool.query(
    `SELECT * FROM payment_references WHERE paystack_ref = $1`,
    [paystackRef]
  );
  return result.rows[0] || null;
}

/** Atomically claim a pending row so only one worker credits the ledger. */
async function claimForProcessing(paystackRef) {
  const result = await pool.query(
    `
      UPDATE payment_references
      SET status = 'processing'
      WHERE paystack_ref = $1
        AND status = 'pending'
      RETURNING *
    `,
    [paystackRef]
  );
  return result.rows[0] || null;
}

async function markSuccess({ paystackRef, transactionId }) {
  const result = await pool.query(
    `
      UPDATE payment_references
      SET status = 'success',
          transaction_id = $2,
          completed_at = NOW()
      WHERE paystack_ref = $1
        AND status IN ('pending', 'processing')
      RETURNING *
    `,
    [paystackRef, transactionId]
  );
  return result.rows[0] || null;
}

async function markFailed(paystackRef) {
  const result = await pool.query(
    `
      UPDATE payment_references
      SET status = 'failed',
          completed_at = NOW()
      WHERE paystack_ref = $1
        AND status IN ('pending', 'processing')
      RETURNING *
    `,
    [paystackRef]
  );
  return result.rows[0] || null;
}

async function resetToPending(paystackRef) {
  const result = await pool.query(
    `
      UPDATE payment_references
      SET status = 'pending',
          completed_at = NULL
      WHERE paystack_ref = $1
        AND status = 'processing'
      RETURNING *
    `,
    [paystackRef]
  );
  return result.rows[0] || null;
}

module.exports = {
  createPendingPayment,
  getByReference,
  claimForProcessing,
  markSuccess,
  markFailed,
  resetToPending,
};
