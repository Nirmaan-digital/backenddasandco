const db = require("../config/db");
const { ensureOrderColumns } = require("./orderModel");

let schemaReady = false;

async function ensureClientColumns() {
  if (schemaReady) return;
  const columns = [
    ["phone", "VARCHAR(50) NULL"],
    ["email", "VARCHAR(255) NULL"],
    ["company", "VARCHAR(255) NULL"],
    ["notes", "TEXT NULL"],
    ["default_percentage", "DECIMAL(6,3) NOT NULL DEFAULT 2"],
  ];
  for (const [name, definition] of columns) {
    const [rows] = await db.query("SHOW COLUMNS FROM clients LIKE ?", [name]);
    if (!rows.length) {
      await db.query(`ALTER TABLE clients ADD COLUMN ${name} ${definition}`);
    }
  }
  schemaReady = true;
}

const earnedExpr = `ROUND(CASE
  WHEN COALESCE(o.gold_earned, 0) > 0 THEN o.gold_earned
  ELSE COALESCE(NULLIF(o.gross_weight, 0), o.net_gold_weight, 0)
       * COALESCE(NULLIF(o.wastage_percent, 0), c.default_percentage, 2) / 100
END, 3)`;

const goldExpr = `COALESCE(NULLIF(o.gross_weight, 0), o.net_gold_weight, 0)`;

// Only orders actually marked Completed count toward a client's Gold
// Designed / Earnings figures — a Pending/In Progress order hasn't been
// delivered yet, so it shouldn't be counted until it's completed.
// orders_count still reflects every order, so a client's full workload
// (including pending) stays visible.
const completedGoldExpr = `COALESCE(SUM(CASE WHEN o.status IN ('Completed','Delivered') THEN ${goldExpr} ELSE 0 END), 0)`;
const completedEarnedExpr = `COALESCE(SUM(CASE WHEN o.status IN ('Completed','Delivered') THEN ${earnedExpr} ELSE 0 END), 0)`;

const getAllClients = async () => {
  await ensureClientColumns();
  await ensureOrderColumns();
  const [rows] = await db.query(`
    SELECT
      c.*,
      COUNT(o.id) AS orders_count,
      ${completedGoldExpr} AS gold_designed,
      ${completedEarnedExpr} AS earnings,
      MAX(o.delivery_date) AS last_order
    FROM clients c
    LEFT JOIN orders o ON o.client_id = c.id
    GROUP BY c.id
    ORDER BY c.id DESC
  `);
  return rows;
};

const getClientById = async (id) => {
  await ensureClientColumns();
  await ensureOrderColumns();
  const [rows] = await db.query(`
    SELECT
      c.*,
      COUNT(o.id) AS orders_count,
      ${completedGoldExpr} AS gold_designed,
      ${completedEarnedExpr} AS earnings,
      MAX(o.delivery_date) AS last_order
    FROM clients c
    LEFT JOIN orders o ON o.client_id = c.id
    WHERE c.id = ?
    GROUP BY c.id
    LIMIT 1
  `, [id]);
  return rows[0] || null;
};

const createClient = async (client_name, phone, email, company, notes, default_percentage = 2) => {
  await ensureClientColumns();
  const percentage = Number.isFinite(Number(default_percentage)) ? Number(default_percentage) : 2;
  const [result] = await db.query(
    `INSERT INTO clients (client_name, phone, email, company, notes, default_percentage)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [client_name, phone, email, company, notes, percentage]
  );
  return result.insertId;
};

const updateClient = async (id, client_name, phone, email, company, notes, default_percentage = 2) => {
  await ensureClientColumns();
  const percentage = Number.isFinite(Number(default_percentage)) ? Number(default_percentage) : 2;
  await db.query(
    `UPDATE clients
     SET client_name=?, phone=?, email=?, company=?, notes=?, default_percentage=?
     WHERE id=?`,
    [client_name, phone, email, company, notes, percentage, id]
  );
};

const deleteClient = async (id) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [orders] = await connection.query("SELECT id FROM orders WHERE client_id=?", [id]);
    for (const order of orders) {
      await connection.query("DELETE FROM gold_transactions WHERE order_id=?", [order.id]);
    }
    await connection.query("DELETE FROM orders WHERE client_id=?", [id]);
    await connection.query("DELETE FROM clients WHERE id=?", [id]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  ensureClientColumns,
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
};
