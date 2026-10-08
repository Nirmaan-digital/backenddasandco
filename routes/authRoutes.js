const express = require("express");

const {
  register,
  login,
  me,
  logout,
} = require("../controllers/authController");

const router = express.Router();

// =====================================
// REGISTER
// POST /api/auth/register
// =====================================

router.post("/register", register);

// =====================================
// LOGIN
// POST /api/auth/login
// =====================================

router.post("/login", login);

// =====================================
// CURRENT USER
// GET /api/auth/me
// =====================================

router.get("/me", me);

// =====================================
// LOGOUT
// POST /api/auth/logout
// =====================================

router.post("/logout", logout);

module.exports = router;