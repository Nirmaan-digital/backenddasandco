const express = require("express");

const {
  getExpenses,
  getExpense,
  addExpense,
  editExpense,
  removeExpense,
} = require("../controllers/expenseController");

const router = express.Router();

// =====================================
// GET ALL EXPENSES
// GET /api/expenses
// =====================================

router.get("/", getExpenses);

// =====================================
// GET SINGLE EXPENSE
// GET /api/expenses/:id
// =====================================

router.get("/:id", getExpense);

// =====================================
// CREATE EXPENSE
// POST /api/expenses
// =====================================

router.post("/", addExpense);

// =====================================
// UPDATE EXPENSE
// PUT /api/expenses/:id
// =====================================

router.put("/:id", editExpense);

// =====================================
// DELETE EXPENSE
// DELETE /api/expenses/:id
// =====================================

router.delete("/:id", removeExpense);

module.exports = router;