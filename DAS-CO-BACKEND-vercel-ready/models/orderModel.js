const db = require("../config/db");

let schemaReady=false;
async function ensureOrderColumns(){
  if(schemaReady) return;
  const columns=[
    ["category","VARCHAR(50) NOT NULL DEFAULT 'Custom'"],
    ["notes","TEXT NULL"],
    ["wastage_percent","DECIMAL(8,3) NOT NULL DEFAULT 0"],
    ["gold_earned","DECIMAL(12,3) NOT NULL DEFAULT 0"],
    ["gold_deducted","TINYINT(1) NOT NULL DEFAULT 0"],
    ["gold_weight","DECIMAL(12,3) NULL"],
    ["stone_weight","DECIMAL(12,3) NULL"],
    ["net_gold_weight","DECIMAL(12,3) NULL"],
    ["delivery_date","DATE NULL"],
    ["status","VARCHAR(50) NOT NULL DEFAULT 'Pending'"]
  ];
  for(const [name,definition] of columns){
    const [rows]=await db.query(`SHOW COLUMNS FROM orders LIKE ?`,[name]);
    if(!rows.length) await db.query(`ALTER TABLE orders ADD COLUMN ${name} ${definition}`);
  }
  schemaReady=true;
}

const orderSelect = `
  SELECT
    o.*,
    c.client_name,
    c.default_percentage,
    o.ornament_name AS project_name,
    COALESCE(NULLIF(o.gross_weight,0),o.net_gold_weight,0) AS gold_weight,
    COALESCE(NULLIF(o.wastage_percent,0), c.default_percentage, 2) AS percentage,
    ROUND(COALESCE(NULLIF(o.gross_weight,0),o.net_gold_weight,0) * COALESCE(NULLIF(o.wastage_percent,0), c.default_percentage, 2) / 100, 3) AS computed_gold_earned,
    ROUND(CASE WHEN COALESCE(o.gold_earned,0) > 0 THEN o.gold_earned ELSE COALESCE(NULLIF(o.gross_weight,0),o.net_gold_weight,0) * COALESCE(NULLIF(o.wastage_percent,0), c.default_percentage, 2) / 100 END, 3) AS earning_gold
  FROM orders o
  LEFT JOIN clients c ON c.id = o.client_id
`;

const getAllOrders = async () => {
  await ensureOrderColumns();
  const [rows] = await db.query(`${orderSelect} ORDER BY o.id DESC`);
  return rows;
};

const getOrderById = async (id) => {
  await ensureOrderColumns();
  const [rows] = await db.query(`${orderSelect} WHERE o.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

const createOrder = async (client_id, order_number, ornament_name, gross_weight, stone_weight, net_gold_weight, wastage_percent, labour_charge, gold_earned, delivery_date, status, notes = null, category = "Custom") => {
  await ensureOrderColumns();
  const [result] = await db.query(`
    INSERT INTO orders
      (client_id, order_number, ornament_name, gross_weight, stone_weight, net_gold_weight, wastage_percent, labour_charge, gold_earned, delivery_date, status, gold_deducted, notes, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `, [client_id, order_number, ornament_name, Number(gross_weight||0), Number(stone_weight||0), Number(net_gold_weight||gross_weight||0), Number(wastage_percent||0), Number(labour_charge||0), Number(gold_earned||0), delivery_date||null, status||"Pending", notes||null, category||"Custom"]);
  return result.insertId;
};

const updateOrder = async (id, client_id, order_number, ornament_name, gross_weight, stone_weight, net_gold_weight, wastage_percent, labour_charge, gold_earned, delivery_date, status, notes = null, category = "Custom") => {
  await ensureOrderColumns();
  await db.query(`
    UPDATE orders SET client_id=?, order_number=?, ornament_name=?, gross_weight=?, stone_weight=?, net_gold_weight=?, wastage_percent=?, labour_charge=?, gold_earned=?, delivery_date=?, status=?, notes=?, category=? WHERE id=?
  `, [client_id, order_number, ornament_name, Number(gross_weight||0), Number(stone_weight||0), Number(net_gold_weight||gross_weight||0), Number(wastage_percent||0), Number(labour_charge||0), Number(gold_earned||0), delivery_date||null, status, notes||null, category||"Custom", id]);
};

const deleteOrder = async (id) => {
  const connection = await db.getConnection();
  try { await connection.beginTransaction(); await connection.query("DELETE FROM gold_transactions WHERE order_id = ?", [id]); await connection.query("DELETE FROM orders WHERE id = ?", [id]); await connection.commit(); }
  catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
};

const getCurrentGoldBalance = async () => {
  const [rows] = await db.query("SELECT balance_after FROM gold_transactions ORDER BY id DESC LIMIT 1");
  if (rows.length) return Number(rows[0].balance_after||0);
  const [settings] = await db.query("SELECT opening_gold_balance FROM business_settings LIMIT 1");
  return Number(settings[0]?.opening_gold_balance||0);
};
const hasOrderGoldTransaction = async (orderId) => { const [rows]=await db.query("SELECT id FROM gold_transactions WHERE order_id=? AND transaction_type='ORDER_EARNED' LIMIT 1",[orderId]); return rows.length>0; };
const insertOrderGoldTransaction = async (orderId, orderNumber, goldEarned) => {
  const gold=Number(goldEarned||0); if(gold<=0 || await hasOrderGoldTransaction(orderId)) return false;
  const current=await getCurrentGoldBalance(); await db.query(`INSERT INTO gold_transactions (transaction_type,reference,gold_added,gold_deducted,balance_after,remarks,order_id,transaction_date) VALUES ('ORDER_EARNED',?,?,?,?,'Gold earned from completed order',?,CURDATE())`,[orderNumber,gold,0,current+gold,orderId]); return true;
};
const markGoldDeducted = async id => { await db.query("UPDATE orders SET gold_deducted=1 WHERE id=?",[id]); };
const processDeliveredOrderGold = async order => {
  if(!order || order.status!=="Delivered" || Number(order.gold_deducted)===1) return false;
  const gold=Number(order.earning_gold??order.gold_earned??order.computed_gold_earned??0); if(gold>0) await insertOrderGoldTransaction(order.id,order.order_number,gold); await markGoldDeducted(order.id); return gold>0;
};
const syncDeliveredOrders = async () => { const [orders]=await db.query("SELECT id FROM orders WHERE status='Delivered' ORDER BY id ASC"); let n=0; for(const o of orders){ const row=await getOrderById(o.id); if(await processDeliveredOrderGold(row)) n++; } return n; };
module.exports={ensureOrderColumns,getAllOrders,getOrderById,createOrder,updateOrder,deleteOrder,getCurrentGoldBalance,hasOrderGoldTransaction,insertOrderGoldTransaction,markGoldDeducted,processDeliveredOrderGold,syncDeliveredOrders};
