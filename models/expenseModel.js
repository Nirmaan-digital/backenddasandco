const db = require("../config/db");

// =====================================
// SCHEMA — ensure client_id exists so
// Casting entries can be linked to a client, and gold_returned
// can be NULL (meaning "not yet entered", distinct from a
// confirmed 0 return).
// =====================================

let schemaReady = false;
const ensureExpenseColumns = async () => {
  if (schemaReady) return;

  const [clientCol] = await db.query(`SHOW COLUMNS FROM expenses LIKE 'client_id'`);
  if (!clientCol.length) {
    await db.query(`ALTER TABLE expenses ADD COLUMN client_id INT NULL`);
  }

  // NULL now means "casting still out, not yet returned" — previously
  // this always defaulted to 0, which made a casting entry register as
  // a 100% loss (and immediately deduct from the Gold Vault) the moment
  // "Gold given" was saved, before the caster had actually returned
  // anything.
  const [returnedCol] = await db.query(`SHOW COLUMNS FROM expenses LIKE 'gold_returned'`);
  if (returnedCol.length && returnedCol[0].Null === "NO") {
    const type = returnedCol[0].Type || "decimal(12,3)";
    await db.query(`ALTER TABLE expenses MODIFY COLUMN gold_returned ${type} NULL DEFAULT NULL`);
  }

  schemaReady = true;
};

// Casting loss is only realized once gold has actually been returned —
// computed here (rather than trusted from a possibly-stale stored/generated
// column) so it always reflects the current NULL-aware rule regardless of
// how the underlying gold_loss column behaves.
const goldLossExpr = `CASE WHEN e.gold_returned IS NULL THEN 0 ELSE GREATEST(COALESCE(e.gold_given,0) - e.gold_returned, 0) END`;

// =====================================
// GET ALL EXPENSES
// =====================================

const getAllExpenses = async () => {
  await ensureExpenseColumns();
  const [rows] = await db.query(`
    SELECT
      e.id,
      e.expense_name,
      e.vendor,
      e.invoice_number,
      e.status,
      e.category,
      e.amount,
      e.client_id,
      c.client_name,
      e.gold_given,
      e.gold_returned,
      ${goldLossExpr} AS gold_loss,
      e.remarks,
      e.expense_date,
      e.created_at
    FROM expenses e
    LEFT JOIN clients c ON c.id = e.client_id
    ORDER BY e.expense_date DESC, e.id DESC
  `);

  return rows;
};

// =====================================
// GET EXPENSE BY ID
// =====================================

const getExpenseById = async (id) => {
  await ensureExpenseColumns();
  const [rows] = await db.query(
    `
    SELECT
      e.id,
      e.expense_name,
      e.vendor,
      e.invoice_number,
      e.status,
      e.category,
      e.amount,
      e.client_id,
      c.client_name,
      e.gold_given,
      e.gold_returned,
      ${goldLossExpr} AS gold_loss,
      e.remarks,
      e.expense_date,
      e.created_at
    FROM expenses e
    LEFT JOIN clients c ON c.id = e.client_id
    WHERE e.id = ?
    `,
    [id]
  );

  return rows[0];
};

// =====================================
// CREATE EXPENSE
// =====================================

const createExpense = async (
  expense_name,
  category,
  amount,
  gold_given,
  gold_returned,
  remarks,
  expense_date,
  client_id = null
) => {
  await ensureExpenseColumns();
  const [result] = await db.query(
    `
    INSERT INTO expenses
    (
      expense_name,
      category,
      amount,
      gold_given,
      gold_returned,
      remarks,
      expense_date,
      client_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      expense_name,
      category,
      amount || 0,
      gold_given || 0,
      // null means "not returned yet" — kept as null rather than
      // coerced to 0, so casting loss isn't assumed before it's known.
      gold_returned === null || gold_returned === undefined ? null : Number(gold_returned),
      remarks || null,
      expense_date || null,
      client_id || null,
    ]
  );

  return result.insertId;
};

// =====================================
// UPDATE EXPENSE
// =====================================

const updateExpense = async (
  id,
  expense_name,
  category,
  amount,
  gold_given,
  gold_returned,
  remarks,
  expense_date,
  client_id = null
) => {
  await ensureExpenseColumns();
  await db.query(
    `
    UPDATE expenses
    SET
      expense_name = ?,
      category = ?,
      amount = ?,
      gold_given = ?,
      gold_returned = ?,
      remarks = ?,
      expense_date = ?,
      client_id = ?
    WHERE id = ?
    `,
    [
      expense_name,
      category,
      amount || 0,
      gold_given || 0,
      gold_returned === null || gold_returned === undefined ? null : Number(gold_returned),
      remarks || null,
      expense_date || null,
      client_id || null,
      id,
    ]
  );
};

// =====================================
// DELETE EXPENSE
// =====================================

const deleteExpense = async (id) => {
  await db.query(
    `
    DELETE FROM expenses
    WHERE id = ?
    `,
    [id]
  );
};

module.exports = {
  ensureExpenseColumns,
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
};
