const mysql = require("mysql2/promise");
const { AsyncLocalStorage } = require("async_hooks");
require("dotenv").config();

function useSsl(flag) {
  if (flag === "true") return true;
  if (flag === "false") return false;
  return false;
}

function createPool(options) {
  return mysql.createPool({
    host: options.host,
    port: Number(options.port) || 3306,
    user: options.user,
    password: options.password,
    database: options.database,
    waitForConnections: true,
    connectionLimit: process.env.VERCEL === "1" ? 2 : options.connectionLimit,
    queueLimit: 0,
    connectTimeout: 15000,
    enableKeepAlive: true,
    ssl: useSsl(options.sslFlag) ? { rejectUnauthorized: false } : undefined,
  });
}

// Real business data.
const mainPool = createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  sslFlag: process.env.DB_SSL,
  connectionLimit: 10,
});

// Separate sandbox database. Demo logins never write to the business database.
// Configure DEMO_DB_* on Vercel. The defaults below keep the existing demo
// database working when those variables are not set.
const demoPool = createPool({
  host: process.env.DEMO_DB_HOST || process.env.DB_HOST,
  port: process.env.DEMO_DB_PORT || process.env.DB_PORT || 3306,
  user: process.env.DEMO_DB_USER || "u750189796_dasandcodemo",
  password: process.env.DEMO_DB_PASSWORD || "DasCoDemo@2026",
  database: process.env.DEMO_DB_NAME || "u750189796_dasco_demo",
  sslFlag: process.env.DEMO_DB_SSL || process.env.DB_SSL,
  connectionLimit: 5,
});

const context = new AsyncLocalStorage();

function currentPool() {
  const store = context.getStore();
  if (store && store.demo && demoPool) return demoPool;
  return mainPool;
}

function runAsDemo(fn) {
  return context.run({ demo: true }, fn);
}

function describeDbError(error) {
  const code = error?.code || error?.errors?.[0]?.code;
  const messages = {
    ECONNREFUSED:
      "Cannot reach MySQL. In Vercel set DB_HOST to the Hostinger remote hostname, not localhost, and enable Remote MySQL.",
    ETIMEDOUT:
      "MySQL connection timed out. Check DB_HOST and Hostinger Remote MySQL access.",
    ENOTFOUND: "MySQL host was not found. Check DB_HOST.",
    EAI_AGAIN: "MySQL host could not be resolved. Check DB_HOST.",
    ER_ACCESS_DENIED_ERROR: "MySQL rejected the database username or password.",
    ER_BAD_DB_ERROR: "MySQL database name was not found. Check DB_NAME.",
  };
  const wrapped = new Error(
    messages[code] || error?.message || error?.errors?.[0]?.message || "Database error"
  );
  wrapped.code = code;
  return wrapped;
}

function wrap(promise) {
  return Promise.resolve(promise).catch((error) => {
    throw describeDbError(error);
  });
}

const db = {
  query: (...args) => wrap(currentPool().query(...args)),
  execute: (...args) => wrap(currentPool().execute(...args)),
  getConnection: (...args) => wrap(currentPool().getConnection(...args)),
  runAsDemo,
  mainPool,
  demoPool,
};

module.exports = db;
