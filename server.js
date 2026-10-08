const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

// =====================================
// DATABASE
// =====================================

<<<<<<< HEAD
const db = require("./config/db");
=======
require("./config/db");
>>>>>>> 2ac321230986c4c0eddfbc755c4cf8bab0359016

// =====================================
// ROUTES
// =====================================

const authRoutes = require("./routes/authRoutes");
const clientRoutes = require("./routes/clientRoutes");
const orderRoutes = require("./routes/orderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const goldVaultRoutes = require("./routes/goldVaultRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

// =====================================
// CREATE APP
// =====================================

const app = express();

// =====================================
// CORS
// =====================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",

  "http://192.168.29.229:5173",
  "http://192.168.29.229:8080",

  "https://dasandco.online",
  "https://www.dasandco.online",
  "http://dasandco.online",
  "http://www.dasandco.online",
];

<<<<<<< HEAD
const allowedOriginPatterns = [
  /^https:\/\/([a-z0-9-]+\.)*dasandco\.online$/i,
  /^https:\/\/([a-z0-9-]+\.)*hostingersite\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i,
];

=======
>>>>>>> 2ac321230986c4c0eddfbc755c4cf8bab0359016
// =====================================
// CORS MIDDLEWARE
// =====================================

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without Origin
      if (!origin) {
        return callback(null, true);
      }

      // Exact allowed origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

<<<<<<< HEAD
      if (allowedOriginPatterns.some((pattern) => pattern.test(origin))) {
        return callback(null, true);
      }

=======
>>>>>>> 2ac321230986c4c0eddfbc755c4cf8bab0359016
      // Allow local network development
      const localNetworkRegex =
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/;

      if (localNetworkRegex.test(origin)) {
        return callback(null, true);
      }

      console.log("Blocked CORS origin:", origin);

      return callback(
        new Error(`Not allowed by CORS: ${origin}`)
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    optionsSuccessStatus: 204,
  })
);

// =====================================
// BODY PARSERS
// =====================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// =====================================
// API ROUTES
// =====================================

app.use("/api/auth", authRoutes);

app.use("/api/clients", clientRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/gold-vault", goldVaultRoutes);

app.use("/api/expenses", expenseRoutes);

app.use("/api/analytics", analyticsRoutes);

app.use("/api/settings", settingsRoutes);

// =====================================
// HOME
// =====================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Das & Co Backend Running 🚀",
    version: "1.0.0",
  });
});

// =====================================
// HEALTH CHECK
// =====================================

<<<<<<< HEAD
app.get("/api/health", async (req, res) => {
  const payload = {
    success: true,
    message: "API is running",
    timestamp: new Date(),
  };

  if (req.query.db !== "1") {
    return res.status(200).json(payload);
  }

  try {
    await db.query("SELECT 1");
    payload.database = "connected";
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
      detail: error.message,
    });
  }
=======
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date(),
  });
>>>>>>> 2ac321230986c4c0eddfbc755c4cf8bab0359016
});

// =====================================
// 404 HANDLER
// =====================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// =====================================
// GLOBAL ERROR HANDLER
// =====================================

app.use((err, req, res, next) => {
  console.error("====================================");
  console.error("SERVER ERROR");
  console.error(err);
  console.error("====================================");

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// =====================================
// START SERVER
// =====================================

const PORT = process.env.PORT || 5000;

// On Vercel, this file is loaded as a serverless function handler
// (via vercel.json) rather than run directly — so only call
// app.listen() when the file is executed directly (e.g. on
// Hostinger/local with `npm start`). Vercel uses the exported
// `app` below instead.
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log("====================================");
    console.log("🚀 DAS & CO Backend Running");
    console.log(`🌐 Server listening on port ${PORT}`);
    console.log(
      `📦 Environment: ${process.env.NODE_ENV || "development"}`
    );
    console.log("====================================");
  });
}

module.exports = app;