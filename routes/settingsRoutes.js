const express=require("express");const db=require("../config/db");const authMiddleware=require("../middleware/authMiddleware");const router=express.Router();
let ready=false;
async function ensureColumns(){
  if(ready) return;
  const cols=[['business_name',"VARCHAR(255) NOT NULL DEFAULT 'DAS & CO'"],['email','VARCHAR(255) NULL'],['phone','VARCHAR(50) NULL'],['address','TEXT NULL'],['default_percentage','DECIMAL(6,3) NOT NULL DEFAULT 2'],['rate_24k','DECIMAL(12,2) NOT NULL DEFAULT 0'],['rate_22k','DECIMAL(12,2) NOT NULL DEFAULT 0'],['rate_18k','DECIMAL(12,2) NOT NULL DEFAULT 0']];
  for(const [name,def] of cols){const [rows]=await db.query('SHOW COLUMNS FROM business_settings LIKE ?',[name]);if(!rows.length) await db.query(`ALTER TABLE business_settings ADD COLUMN ${name} ${def}`);}
  ready=true;
}
router.get("/",authMiddleware,async(req,res)=>{try{await ensureColumns();const [rows]=await db.query("SELECT * FROM business_settings LIMIT 1");const r=rows[0]||{};res.json({success:true,settings:{business_name:r.business_name||"DAS & CO",email:r.email||"",phone:r.phone||"",address:r.address||"",opening_gold_balance:Number(r.opening_gold_balance||0),default_percentage:Number(r.default_percentage||2),rate_24k:Number(r.rate_24k||0),rate_22k:Number(r.rate_22k||0),rate_18k:Number(r.rate_18k||0)}});}catch(e){res.status(500).json({success:false,message:e.message});}});
router.put("/",authMiddleware,async(req,res)=>{try{await ensureColumns();const data={business_name:req.body.business_name||"DAS & CO",email:req.body.email||"",phone:req.body.phone||"",address:req.body.address||"",opening_gold_balance:Number(req.body.opening_gold_balance||0),default_percentage:Number(req.body.default_percentage||2),rate_24k:Number(req.body.rate_24k||0),rate_22k:Number(req.body.rate_22k||0),rate_18k:Number(req.body.rate_18k||0)};const [rows]=await db.query("SELECT id FROM business_settings LIMIT 1");if(rows.length){await db.query(`UPDATE business_settings SET business_name=?,email=?,phone=?,address=?,opening_gold_balance=?,default_percentage=?,rate_24k=?,rate_22k=?,rate_18k=? WHERE id=?`,[data.business_name,data.email,data.phone,data.address,data.opening_gold_balance,data.default_percentage,data.rate_24k,data.rate_22k,data.rate_18k,rows[0].id]);}else{await db.query(`INSERT INTO business_settings (business_name,email,phone,address,opening_gold_balance,default_percentage,rate_24k,rate_22k,rate_18k) VALUES(?,?,?,?,?,?,?,?,?)`,Object.values(data));}res.json({success:true,message:"Settings updated successfully",settings:data});}catch(e){res.status(500).json({success:false,message:e.message});}});
// =====================================================
// EXPORT — full JSON snapshot of all business data
// =====================================================
router.get("/export", authMiddleware, async (req, res) => {
  try {
    await ensureColumns();
    const [clients] = await db.query("SELECT * FROM clients");
    const [orders] = await db.query("SELECT * FROM orders");
    const [expenses] = await db.query("SELECT * FROM expenses");
    const [goldTransactions] = await db.query("SELECT * FROM gold_transactions");
    const [settingsRows] = await db.query("SELECT * FROM business_settings LIMIT 1");
    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      version: 1,
      data: {
        clients,
        orders,
        expenses,
        gold_transactions: goldTransactions,
        settings: settingsRows[0] || null,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// =====================================================
// IMPORT — replaces all business data with a previously
// exported snapshot (same shape as the /export response's
// "data" field). Runs as one transaction so a failure partway
// through leaves the original data untouched.
// =====================================================
router.post("/import", authMiddleware, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const payload = req.body?.data || req.body;
    if (!payload || typeof payload !== "object") throw new Error("No data provided to import");
    const {
      clients = [],
      orders = [],
      expenses = [],
      gold_transactions: goldTransactions = [],
      settings = null,
    } = payload;

    const insertRows = async (table, rows) => {
      for (const row of rows) {
        const cols = Object.keys(row);
        if (!cols.length) continue;
        const placeholders = cols.map(() => "?").join(",");
        await conn.query(
          `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(",")}) VALUES (${placeholders})`,
          cols.map((c) => row[c])
        );
      }
    };

    await conn.beginTransaction();
    await conn.query("SET FOREIGN_KEY_CHECKS=0");

    await conn.query("DELETE FROM gold_transactions");
    await conn.query("DELETE FROM expenses");
    await conn.query("DELETE FROM orders");
    await conn.query("DELETE FROM clients");

    await insertRows("clients", clients);
    await insertRows("orders", orders);
    await insertRows("expenses", expenses);
    await insertRows("gold_transactions", goldTransactions);

    if (settings) {
      await conn.query("DELETE FROM business_settings");
      const cols = Object.keys(settings);
      const placeholders = cols.map(() => "?").join(",");
      await conn.query(
        `INSERT INTO business_settings (${cols.map((c) => `\`${c}\``).join(",")}) VALUES (${placeholders})`,
        cols.map((c) => settings[c])
      );
    }

    await conn.query("SET FOREIGN_KEY_CHECKS=1");
    await conn.commit();
    res.json({ success: true, message: "Data imported successfully" });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, message: e.message });
  } finally {
    conn.release();
  }
});

// =====================================================
// RESET — permanently deletes all business data (clients,
// orders, expenses, gold ledger). The logged-in account and
// saved business settings/gold rates are kept, so you aren't
// locked out and don't have to re-enter your rates.
// =====================================================
router.post("/reset", authMiddleware, async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    await conn.query("DELETE FROM gold_transactions");
    await conn.query("DELETE FROM expenses");
    await conn.query("DELETE FROM orders");
    await conn.query("DELETE FROM clients");
    await conn.query("SET FOREIGN_KEY_CHECKS=1");
    await conn.commit();
    res.json({ success: true, message: "All business data has been reset" });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ success: false, message: e.message });
  } finally {
    conn.release();
  }
});

module.exports=router;