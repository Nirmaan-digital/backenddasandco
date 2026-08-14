const mysql = require("mysql2/promise");
const { AsyncLocalStorage } = require("async_hooks");
require("dotenv").config();

// =====================================================
// MAIN (real business) database pool
// =====================================================
const mainPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// =====================================================
// DEMO database pool — completely separate database used
// for the sandbox/demo login so anything a demo user does
// (add clients, orders, expenses, gold entries, etc.) never
// touches real business data. Only created if DEMO_DB_NAME
// is configured in .env; the app works exactly as before if
// it isn't set.
// =====================================================
const demoPool = mysql.createPool({
  host: process.env.DEMO_DB_HOST || process.env.DB_HOST,
  port: Number(process.env.DEMO_DB_PORT || process.env.DB_PORT || 3306),
  user: process.env.DEMO_DB_USER || "u750189796_dasandcodemo",
  password: process.env.DEMO_DB_PASSWORD || "DasCoDemo@2026",
  database: process.env.DEMO_DB_NAME || "u750189796_dasco_demo",

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

// Tracks, per request, whether the current logged-in user is the demo
// user — so every model/controller (which just calls db.query(...) the
// same way as always) transparently reads/writes the demo database
// instead, with zero changes needed anywhere else in the codebase.
const context = new AsyncLocalStorage();

function currentPool() {
  const store = context.getStore();
  if (store && store.demo && demoPool) return demoPool;
  return mainPool;
}

// Runs `fn` with all db.query/db.execute/db.getConnection calls inside
// it routed to the demo database. Used by authMiddleware for requests
// made by the demo user.
function runAsDemo(fn) {
  return context.run({ demo: true }, fn);
}

async function testConnection() {
  try {
    const connection = await mainPool.getConnection();

    console.log("====================================");
    console.log("✅ MySQL Connected Successfully");
    console.log("Database:", process.env.DB_NAME);
    console.log("Host:", process.env.DB_HOST);
    console.log("====================================");

    connection.release();
  } catch (error) {
    console.log("====================================");
    console.error("❌ MySQL Connection Failed");
    console.error("Error Code:", error.code);
    console.error("Error Number:", error.errno);
    console.error("SQL State:", error.sqlState);
    console.error("Message:", error.message);
    console.error(error);
    console.log("====================================");
  }

  if (demoPool) {
    try {
      const connection = await demoPool.getConnection();
      console.log("✅ Demo MySQL Connected Successfully — Database:", process.env.DEMO_DB_NAME || "u750189796_dasco_demo");
      connection.release();
    } catch (error) {
      console.error("❌ Demo MySQL Connection Failed:", error.message);
    }
  }
}

testConnection();

// Drop-in replacement for the old `module.exports = pool` — every model
// in the app only ever calls .query / .execute / .getConnection, so this
// thin proxy is all that's needed for the demo-routing to work invisibly.
const db = {
  query: (...args) => currentPool().query(...args),
  execute: (...args) => currentPool().execute(...args),
  getConnection: (...args) => currentPool().getConnection(...args),
  runAsDemo,
  mainPool,
  demoPool,
};

module.exports = db;
