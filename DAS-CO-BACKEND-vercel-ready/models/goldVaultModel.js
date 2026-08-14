const db = require("../config/db");

// =====================================================
// SCHEMA — link gold_transactions to their source expense
// so casting-loss entries can be kept in sync with the
// Expenses tab (create/edit/delete).
// =====================================================

let schemaReady = false;
const ensureGoldTransactionColumns = async () => {
  if (schemaReady) return;
  const [rows] = await db.query(`SHOW COLUMNS FROM gold_transactions LIKE 'expense_id'`);
  if (!rows.length) {
    await db.query(`ALTER TABLE gold_transactions ADD COLUMN expense_id INT NULL`);
  }
  schemaReady = true;
};

// =====================================================
// GET ALL GOLD TRANSACTIONS
// =====================================================

const getAllTransactions = async () => {
  const [rows] = await db.query(`
    SELECT
      gt.*,
      o.order_number
    FROM gold_transactions gt
    LEFT JOIN orders o
      ON gt.order_id = o.id
    ORDER BY gt.id DESC
  `);

  return rows;
};

// =====================================================
// GET CURRENT BALANCE
// =====================================================

const getCurrentBalance = async () => {
  const [rows] = await db.query(`
    SELECT balance_after
    FROM gold_transactions
    ORDER BY id DESC
    LIMIT 1
  `);

  if (rows.length) {
    return Number(
      rows[0].balance_after
    ) || 0;
  }

  const [settings] =
    await db.query(`
      SELECT opening_gold_balance
      FROM business_settings
      LIMIT 1
    `);

  return settings.length
    ? Number(
        settings[0]
          .opening_gold_balance
      ) || 0
    : 0;
};

// =====================================================
// CREATE TRANSACTION
// =====================================================

const createTransaction = async (
  transaction_type,
  gold_added,
  gold_deducted,
  remarks,
  order_id,
  transaction_date,
  expense_id = null
) => {
  await ensureGoldTransactionColumns();

  const balance =
    await getCurrentBalance();

  const added =
    Number(gold_added) || 0;

  const deducted =
    Number(gold_deducted) || 0;

  const newBalance =
    balance +
    added -
    deducted;

  const [result] =
    await db.query(
      `
        INSERT INTO gold_transactions
        (
          transaction_type,
          gold_added,
          gold_deducted,
          balance_after,
          remarks,
          order_id,
          expense_id,
          transaction_date
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        transaction_type,
        added,
        deducted,
        newBalance,
        remarks || null,
        order_id || null,
        expense_id || null,
        transaction_date ||
          new Date()
            .toISOString()
            .split("T")[0],
      ]
    );

  return result.insertId;
};

// =====================================================
// SYNC A CASTING-LOSS DEDUCTION FOR AN EXPENSE
// Removes any previous gold_transactions row linked to
// this expense, then (re)creates one if there is a loss.
// =====================================================

const syncCastingLossTransaction = async (
  expense_id,
  gold_loss,
  remarks,
  transaction_date
) => {
  await ensureGoldTransactionColumns();
  await db.query(`DELETE FROM gold_transactions WHERE expense_id = ?`, [expense_id]);
  const loss = Number(gold_loss) || 0;
  if (loss > 0) {
    await createTransaction(
      "CASTING_LOSS",
      0,
      loss,
      remarks || "Gold lost during casting",
      null,
      transaction_date,
      expense_id
    );
  }
};

const removeCastingLossTransaction = async (expense_id) => {
  await ensureGoldTransactionColumns();
  await db.query(`DELETE FROM gold_transactions WHERE expense_id = ?`, [expense_id]);
};

// =====================================================
// DELETE TRANSACTION
// =====================================================

const deleteTransaction = async (
  id
) => {
  await db.query(
    `
      DELETE FROM gold_transactions
      WHERE id = ?
    `,
    [id]
  );
};

module.exports = {
  ensureGoldTransactionColumns,
  getAllTransactions,
  getCurrentBalance,
  createTransaction,
  deleteTransaction,
  syncCastingLossTransaction,
  removeCastingLossTransaction,
};