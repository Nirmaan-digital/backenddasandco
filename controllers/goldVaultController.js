const {
  getAllTransactions,
  getCurrentBalance,
  createTransaction,
  deleteTransaction,
} = require("../models/goldVaultModel");

const db = require("../config/db");

// =====================================================
// GET GOLD VAULT
// =====================================================

const getTransactions = async (
  req,
  res
) => {
  try {
    const transactions =
      await getAllTransactions();

    const balance =
      await getCurrentBalance();

    const [settings] =
      await db.query(
        `
          SELECT
            opening_gold_balance,
            rate_22k
          FROM business_settings
          LIMIT 1
        `
      );

    const opening =
      settings.length
        ? Number(
            settings[0]
              .opening_gold_balance
          ) || 0
        : 0;

    const rate =
      settings.length
        ? Number(
            settings[0].rate_22k
          ) || 0
        : 0;

    const totalAdded =
      transactions.reduce(
        (sum, transaction) =>
          sum +
          Number(
            transaction.gold_added
          ),
        0
      );

    const totalDeducted =
      transactions.reduce(
        (sum, transaction) =>
          sum +
          Number(
            transaction.gold_deducted
          ),
        0
      );

    return res.status(200).json({
      success: true,

      opening,

      balance,

      rate,

      totalAdded,

      totalDeducted,

      transactions,
    });
  } catch (error) {
    console.error(
      "Get Gold Vault Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// ADD TRANSACTION
// =====================================================

const addTransaction = async (
  req,
  res
) => {
  try {
    const {
      transaction_type,
      gold_added,
      gold_deducted,
      remarks,
      order_id,
      transaction_date,
    } = req.body;

    if (!transaction_type) {
      return res.status(400).json({
        success: false,
        message:
          "Transaction type is required",
      });
    }

    const id =
      await createTransaction(
        transaction_type,
        gold_added,
        gold_deducted,
        remarks,
        order_id,
        transaction_date
      );

    return res.status(201).json({
      success: true,
      message:
        "Transaction added successfully",
      id,
    });
  } catch (error) {
    console.error(
      "Add Gold Transaction Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =====================================================
// DELETE TRANSACTION
// =====================================================

const removeTransaction = async (
  req,
  res
) => {
  try {
    await deleteTransaction(
      Number(req.params.id)
    );

    return res.status(200).json({
      success: true,
      message:
        "Transaction deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete Gold Transaction Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getTransactions,
  addTransaction,
  removeTransaction,
};