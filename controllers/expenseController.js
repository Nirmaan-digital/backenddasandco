const {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} = require("../models/expenseModel");

const {
  syncCastingLossTransaction,
  removeCastingLossTransaction,
} = require("../models/goldVaultModel");

// =====================================
// GET ALL EXPENSES
// =====================================

const getExpenses = async (req, res) => {
  try {
    const expenses = await getAllExpenses();

    res.status(200).json({
      success: true,
      expenses,
    });
  } catch (error) {
    console.error("Get Expenses Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to get expenses",
    });
  }
};

// =====================================
// GET SINGLE EXPENSE
// =====================================

const getExpense = async (req, res) => {
  try {
    const expense = await getExpenseById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    res.status(200).json({
      success: true,
      expense,
    });
  } catch (error) {
    console.error("Get Expense Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to get expense",
    });
  }
};

// =====================================
// CREATE EXPENSE
// =====================================

const addExpense = async (req, res) => {
  try {
    const {
      expense_name,
      category,
      amount,
      gold_given,
      gold_returned,
      remarks,
      expense_date,
      client_id,
    } = req.body;

    // =================================
    // CATEGORY VALIDATION
    // =================================

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Expense category is required",
      });
    }

    // =================================
    // 3D PRINTING
    // =================================

    if (category === "3D Printing") {
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: "3D Printing expense amount is required",
        });
      }
    }

    // =================================
    // CASTING
    // =================================

    let finalGoldGiven = 0;
    let finalGoldReturned = null;

    if (category === "Casting") {
      finalGoldGiven = Number(gold_given || 0);
      // Leave finalGoldReturned as null when the field wasn't filled in —
      // that means the casting is still out with the caster, so there's
      // no loss to register yet. Only an explicit value (including 0)
      // counts as a confirmed return.
      finalGoldReturned =
        gold_returned === undefined || gold_returned === null || gold_returned === ""
          ? null
          : Number(gold_returned);

      if (finalGoldGiven <= 0) {
        return res.status(400).json({
          success: false,
          message: "Gold given is required",
        });
      }

      if (finalGoldReturned !== null && finalGoldReturned < 0) {
        return res.status(400).json({
          success: false,
          message: "Gold returned cannot be negative",
        });
      }

      if (finalGoldReturned !== null && finalGoldReturned > finalGoldGiven) {
        return res.status(400).json({
          success: false,
          message:
            "Gold returned cannot be greater than gold given",
        });
      }
    }

    // =================================
    // CREATE
    // =================================

    const id = await createExpense(
      expense_name ||
        (category === "Casting"
          ? "Casting"
          : "3D Printing"),

      category,

      category === "3D Printing"
        ? Number(amount || 0)
        : 0,

      finalGoldGiven,

      finalGoldReturned,

      remarks || null,

      expense_date || null,

      category === "Casting" ? (client_id || null) : null
    );

    // Only register a Gold Vault deduction once the return has actually
    // been confirmed (finalGoldReturned is not null) — not the moment
    // gold is given out, since the casting isn't finished yet at that point.
    if (category === "Casting" && finalGoldReturned !== null) {
      await syncCastingLossTransaction(
        id,
        finalGoldGiven - finalGoldReturned,
        `Casting loss · ${expense_name || "Casting entry"}`,
        expense_date || null
      );
    }

    res.status(201).json({
      success: true,
      message: "Expense added successfully",
      id,
    });
  } catch (error) {
    console.error("Create Expense Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to create expense",
    });
  }
};

// =====================================
// UPDATE EXPENSE
// =====================================

const editExpense = async (req, res) => {
  try {
    const {
      expense_name,
      category,
      amount,
      gold_given,
      gold_returned,
      remarks,
      expense_date,
      client_id,
    } = req.body;

    // =================================
    // CATEGORY VALIDATION
    // =================================

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Expense category is required",
      });
    }

    // =================================
    // 3D PRINTING
    // =================================

    if (category === "3D Printing") {
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: "3D Printing expense amount is required",
        });
      }
    }

    // =================================
    // CASTING
    // =================================

    let finalGoldGiven = 0;
    let finalGoldReturned = null;

    if (category === "Casting") {
      finalGoldGiven = Number(gold_given || 0);
      finalGoldReturned =
        gold_returned === undefined || gold_returned === null || gold_returned === ""
          ? null
          : Number(gold_returned);

      if (finalGoldGiven <= 0) {
        return res.status(400).json({
          success: false,
          message: "Gold given is required",
        });
      }

      if (finalGoldReturned !== null && finalGoldReturned < 0) {
        return res.status(400).json({
          success: false,
          message: "Gold returned cannot be negative",
        });
      }

      if (finalGoldReturned !== null && finalGoldReturned > finalGoldGiven) {
        return res.status(400).json({
          success: false,
          message:
            "Gold returned cannot be greater than gold given",
        });
      }
    }

    // =================================
    // UPDATE
    // =================================

    await updateExpense(
      req.params.id,

      expense_name ||
        (category === "Casting"
          ? "Casting"
          : "3D Printing"),

      category,

      category === "3D Printing"
        ? Number(amount || 0)
        : 0,

      finalGoldGiven,

      finalGoldReturned,

      remarks || null,

      expense_date || null,

      category === "Casting" ? (client_id || null) : null
    );

    if (category === "Casting" && finalGoldReturned !== null) {
      await syncCastingLossTransaction(
        req.params.id,
        finalGoldGiven - finalGoldReturned,
        `Casting loss · ${expense_name || "Casting entry"}`,
        expense_date || null
      );
    } else {
      // Not (yet) a confirmed return — make sure no stale deduction from
      // a previous edit is still sitting in the Gold Vault.
      await removeCastingLossTransaction(req.params.id);
    }

    res.status(200).json({
      success: true,
      message: "Expense updated successfully",
    });
  } catch (error) {
    console.error("Update Expense Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to update expense",
    });
  }
};

// =====================================
// DELETE EXPENSE
// =====================================

const removeExpense = async (req, res) => {
  try {
    await removeCastingLossTransaction(req.params.id);
    await deleteExpense(req.params.id);

    res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Delete Expense Error:", error);

    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete expense",
    });
  }
};

module.exports = {
  getExpenses,
  getExpense,
  addExpense,
  editExpense,
  removeExpense,
};