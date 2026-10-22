const pool = require('../dbcon');

const ACCOUNT_NAMES = {
  PAYSTACK_CLEARING: 'Paystack Clearing',
  GATEWAY_FEE: 'Gateway Fee Expense',
  PENDING_DISBURSAL: 'Pending Disbursal',
};

function userWalletName(userId) {
  return `User Wallet - ${userId}`;
}

/**
 * Build balanced deposit posting lines (amounts in major units).
 * Fee lines omitted when fee is missing/zero or not in the same currency book.
 */
function buildDepositPostingLines({ grossAmount, feeAmount = 0 }) {
  const gross = Number.parseFloat(grossAmount);
  const fee = Number.parseFloat(feeAmount) || 0;

  if (!Number.isFinite(gross) || gross <= 0) {
    throw new Error('Deposit gross amount must be positive');
  }

  const lines = [
    { accountKey: 'PAYSTACK_CLEARING', direction: 'DEBIT', amount: gross },
    { accountKey: 'USER_WALLET', direction: 'CREDIT', amount: gross },
  ];

  if (Number.isFinite(fee) && fee > 0) {
    lines.push(
      { accountKey: 'GATEWAY_FEE', direction: 'DEBIT', amount: fee },
      { accountKey: 'PAYSTACK_CLEARING', direction: 'CREDIT', amount: fee }
    );
  }

  assertBalanced(lines);
  return lines;
}

function assertBalanced(lines) {
  const debit = lines
    .filter((l) => l.direction === 'DEBIT')
    .reduce((sum, l) => sum + Number(l.amount), 0);
  const credit = lines
    .filter((l) => l.direction === 'CREDIT')
    .reduce((sum, l) => sum + Number(l.amount), 0);

  if (Math.abs(debit - credit) > 0.00005) {
    throw new Error(
      `Unbalanced journal: debits=${debit.toFixed(4)} credits=${credit.toFixed(4)}`
    );
  }
}

async function getAccountByName(client, name) {
  const result = await client.query(
    `SELECT account_id, user_id, name, type, currency FROM accounts WHERE name = $1`,
    [name]
  );
  return result.rows[0] || null;
}

async function ensureSystemAccounts(client = pool) {
  const currency = (process.env.PAYSTACK_CURRENCY || 'GHS').toUpperCase().slice(0, 3);
  for (const [name, type] of [
    [ACCOUNT_NAMES.PAYSTACK_CLEARING, 'ASSET'],
    [ACCOUNT_NAMES.GATEWAY_FEE, 'EXPENSE'],
    [ACCOUNT_NAMES.PENDING_DISBURSAL, 'LIABILITY'],
  ]) {
    await client.query(
      `
        INSERT INTO accounts (user_id, name, type, currency)
        VALUES (NULL, $1, $2::account_type, $3)
        ON CONFLICT (name) DO NOTHING
      `,
      [name, type, currency]
    );
  }
}

function buildWithdrawPendingLines(amount) {
  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Withdrawal amount must be positive');
  }
  const lines = [
    { accountKey: 'USER_WALLET', direction: 'DEBIT', amount: value },
    { accountKey: 'PENDING_DISBURSAL', direction: 'CREDIT', amount: value },
  ];
  assertBalanced(lines);
  return lines;
}

function buildWithdrawSuccessLines(amount) {
  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Withdrawal amount must be positive');
  }
  const lines = [
    { accountKey: 'PENDING_DISBURSAL', direction: 'DEBIT', amount: value },
    { accountKey: 'PAYSTACK_CLEARING', direction: 'CREDIT', amount: value },
  ];
  assertBalanced(lines);
  return lines;
}

function buildWithdrawRevertLines(amount) {
  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Withdrawal amount must be positive');
  }
  const lines = [
    { accountKey: 'PENDING_DISBURSAL', direction: 'DEBIT', amount: value },
    { accountKey: 'USER_WALLET', direction: 'CREDIT', amount: value },
  ];
  assertBalanced(lines);
  return lines;
}

/**
 * Generic balanced journal insert (idempotent by key).
 */
async function postBalancedJournal({
  userId,
  amount,
  idempotencyKey,
  description,
  buildLines,
  currency,
  client: externalClient = null,
}) {
  if (!idempotencyKey) {
    throw new Error('idempotency_key is required');
  }

  const ownsTransaction = !externalClient;
  const client = externalClient || (await pool.connect());

  try {
    if (ownsTransaction) {
      await client.query('BEGIN');
    }

    const existing = await getJournalByIdempotencyKey(client, idempotencyKey);
    if (existing) {
      if (ownsTransaction) await client.query('COMMIT');
      return { alreadyProcessed: true, journalEntry: existing };
    }

    await ensureSystemAccounts(client);
    const wallet = await ensureUserWalletAccount(userId, {
      client,
      currency,
      forUpdate: true,
    });
    const clearing = await getAccountByName(client, ACCOUNT_NAMES.PAYSTACK_CLEARING);
    const feeAccount = await getAccountByName(client, ACCOUNT_NAMES.GATEWAY_FEE);
    const pending = await getAccountByName(client, ACCOUNT_NAMES.PENDING_DISBURSAL);

    if (!clearing || !feeAccount || !wallet || !pending) {
      throw new Error('Required ledger accounts are missing');
    }

    const lockIds = [
      clearing.account_id,
      feeAccount.account_id,
      wallet.account_id,
      pending.account_id,
    ].sort((a, b) => a - b);
    await client.query(
      `SELECT account_id FROM accounts WHERE account_id = ANY($1::int[]) ORDER BY account_id FOR UPDATE`,
      [lockIds]
    );

    const lines = buildLines(amount);
    const accountByKey = {
      PAYSTACK_CLEARING: clearing.account_id,
      GATEWAY_FEE: feeAccount.account_id,
      USER_WALLET: wallet.account_id,
      PENDING_DISBURSAL: pending.account_id,
    };

    let journalEntry;
    try {
      const je = await client.query(
        `
          INSERT INTO journal_entries (idempotency_key, description, status)
          VALUES ($1, $2, 'posted')
          RETURNING *
        `,
        [idempotencyKey, description]
      );
      journalEntry = je.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        const again = await getJournalByIdempotencyKey(client, idempotencyKey);
        if (ownsTransaction) await client.query('COMMIT');
        return { alreadyProcessed: true, journalEntry: again };
      }
      throw err;
    }

    for (const line of lines) {
      await client.query(
        `
          INSERT INTO postings (journal_entry_id, account_id, amount, direction)
          VALUES ($1, $2, $3, $4::posting_direction)
        `,
        [journalEntry.journal_entry_id, accountByKey[line.accountKey], line.amount, line.direction]
      );
    }

    if (ownsTransaction) {
      await client.query('COMMIT');
    }

    return { alreadyProcessed: false, journalEntry, lines };
  } catch (err) {
    if (ownsTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
    }
    throw err;
  } finally {
    if (ownsTransaction) {
      client.release();
    }
  }
}

async function postWithdrawPendingJournal(opts) {
  return postBalancedJournal({
    ...opts,
    description: opts.description || 'Paystack withdrawal pending',
    buildLines: buildWithdrawPendingLines,
  });
}

async function postWithdrawSuccessJournal(opts) {
  return postBalancedJournal({
    ...opts,
    description: opts.description || 'Paystack withdrawal settled',
    buildLines: buildWithdrawSuccessLines,
  });
}

async function postWithdrawRevertJournal(opts) {
  return postBalancedJournal({
    ...opts,
    description: opts.description || 'Paystack withdrawal reverted',
    buildLines: buildWithdrawRevertLines,
  });
}

/**
 * Provision (or return) the user's liability wallet account.
 * Locks the row with FOR UPDATE when a transaction client is provided.
 */
async function ensureUserWalletAccount(userId, { client = pool, currency = null, forUpdate = false } = {}) {
  const name = userWalletName(userId);
  const cur = (currency || process.env.PAYSTACK_CURRENCY || 'GHS').toUpperCase().slice(0, 3);

  await client.query(
    `
      INSERT INTO accounts (user_id, name, type, currency)
      VALUES ($1, $2, 'LIABILITY'::account_type, $3)
      ON CONFLICT (name) DO NOTHING
    `,
    [userId, name, cur]
  );

  const lockSql = forUpdate ? ' FOR UPDATE' : '';
  const result = await client.query(
    `SELECT account_id, user_id, name, type, currency FROM accounts WHERE name = $1${lockSql}`,
    [name]
  );
  return result.rows[0];
}

async function getJournalByIdempotencyKey(client, idempotencyKey) {
  const result = await client.query(
    `SELECT * FROM journal_entries WHERE idempotency_key = $1`,
    [idempotencyKey]
  );
  return result.rows[0] || null;
}

/**
 * Post a Paystack Option 1 deposit journal (idempotent by reference).
 * If `client` is provided, caller owns BEGIN/COMMIT.
 */
async function postDepositJournal({
  userId,
  grossAmount,
  feeAmount = 0,
  idempotencyKey,
  currency,
  description = 'Paystack deposit',
  client: externalClient = null,
}) {
  if (!idempotencyKey) {
    throw new Error('idempotency_key is required');
  }

  const ownsTransaction = !externalClient;
  const client = externalClient || (await pool.connect());

  try {
    if (ownsTransaction) {
      await client.query('BEGIN');
    }

    const existing = await getJournalByIdempotencyKey(client, idempotencyKey);
    if (existing) {
      if (ownsTransaction) await client.query('COMMIT');
      return { alreadyProcessed: true, journalEntry: existing };
    }

    await ensureSystemAccounts(client);
    const wallet = await ensureUserWalletAccount(userId, {
      client,
      currency,
      forUpdate: true,
    });
    const clearing = await getAccountByName(client, ACCOUNT_NAMES.PAYSTACK_CLEARING);
    const feeAccount = await getAccountByName(client, ACCOUNT_NAMES.GATEWAY_FEE);

    if (!clearing || !feeAccount || !wallet) {
      throw new Error('Required ledger accounts are missing');
    }

    // Lock system accounts in account_id order to avoid deadlocks.
    const lockIds = [clearing.account_id, feeAccount.account_id, wallet.account_id]
      .sort((a, b) => a - b);
    await client.query(
      `SELECT account_id FROM accounts WHERE account_id = ANY($1::int[]) ORDER BY account_id FOR UPDATE`,
      [lockIds]
    );

    const lines = buildDepositPostingLines({ grossAmount, feeAmount });
    const accountByKey = {
      PAYSTACK_CLEARING: clearing.account_id,
      GATEWAY_FEE: feeAccount.account_id,
      USER_WALLET: wallet.account_id,
    };

    let journalEntry;
    try {
      const je = await client.query(
        `
          INSERT INTO journal_entries (idempotency_key, description, status)
          VALUES ($1, $2, 'posted')
          RETURNING *
        `,
        [idempotencyKey, description]
      );
      journalEntry = je.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        const again = await getJournalByIdempotencyKey(client, idempotencyKey);
        if (ownsTransaction) await client.query('COMMIT');
        return { alreadyProcessed: true, journalEntry: again };
      }
      throw err;
    }

    for (const line of lines) {
      const accountId = accountByKey[line.accountKey];
      await client.query(
        `
          INSERT INTO postings (journal_entry_id, account_id, amount, direction)
          VALUES ($1, $2, $3, $4::posting_direction)
        `,
        [journalEntry.journal_entry_id, accountId, line.amount, line.direction]
      );
    }

    if (ownsTransaction) {
      await client.query('COMMIT');
    }

    return { alreadyProcessed: false, journalEntry, lines };
  } catch (err) {
    if (ownsTransaction) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
    }
    throw err;
  } finally {
    if (ownsTransaction) {
      client.release();
    }
  }
}

/**
 * Liability balance for a user wallet (credits − debits).
 */
async function getUserWalletBalance(userId) {
  const name = userWalletName(userId);
  const result = await pool.query(
    `
      SELECT COALESCE(
        SUM(
          CASE
            WHEN p.direction = 'CREDIT' THEN p.amount
            WHEN p.direction = 'DEBIT' THEN -p.amount
            ELSE 0
          END
        ),
        0
      )::numeric AS balance
      FROM accounts a
      LEFT JOIN postings p ON p.account_id = a.account_id
      WHERE a.name = $1
    `,
    [name]
  );
  return Number.parseFloat(result.rows[0]?.balance || 0);
}

module.exports = {
  ACCOUNT_NAMES,
  userWalletName,
  buildDepositPostingLines,
  buildWithdrawPendingLines,
  buildWithdrawSuccessLines,
  buildWithdrawRevertLines,
  assertBalanced,
  ensureSystemAccounts,
  ensureUserWalletAccount,
  postDepositJournal,
  postWithdrawPendingJournal,
  postWithdrawSuccessJournal,
  postWithdrawRevertJournal,
  getUserWalletBalance,
  getJournalByIdempotencyKey,
};
