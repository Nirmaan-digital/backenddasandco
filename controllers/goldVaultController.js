const {
  getAllTransactions,
<<<<<<< HEAD
=======
  getCurrentBalance,
>>>>>>> 2ac321230986c4c0eddfbc755c4cf8bab0359016
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

<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
    const balance =
      await getCurrentBalance();

>>>>>>> 542a8888f8fc1a8b362d8b1e4f28d43200e75905
>>>>>>> c4e8e137fe0c3193200dc50d8324092cbbd50d6d
>>>>>>> 91f348a6e92d41be4d4a4c6fae327e08bf68258d
>>>>>>> 2ac321230986c4c0eddfbc755c4cf8bab0359016
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

<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> c4e8e137fe0c3193200dc50d8324092cbbd50d6d
>>>>>>> 91f348a6e92d41be4d4a4c6fae327e08bf68258d
>>>>>>> 2ac321230986c4c0eddfbc755c4cf8bab0359016
    // The running "balance after" stored on each transaction row
    // was frozen at the opening balance that existed when it was
    // created. If the opening balance is changed later in Settings,
    // those stored numbers go stale. Recomputing the whole chain
    // live — from the current opening balance forward through every
    // transaction in chronological order — keeps the ledger, the
    // per-row balances, and the Current Balance total always in
    // sync with whatever the opening balance is set to right now.
    const chronological = [...transactions].sort((a, b) => a.id - b.id);
    let running = opening;
    const recomputedById = new Map();
    for (const t of chronological) {
      running += Number(t.gold_added || 0) - Number(t.gold_deducted || 0);
      recomputedById.set(t.id, running);
    }
    const transactionsWithBalances = transactions.map((t) => ({
      ...t,
      balance_after: recomputedById.get(t.id) ?? t.balance_after,
    }));
    const balance = chronological.length ? running : opening;

<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
=======
>>>>>>> 542a8888f8fc1a8b362d8b1e4f28d43200e75905
>>>>>>> c4e8e137fe0c3193200dc50d8324092cbbd50d6d
>>>>>>> 91f348a6e92d41be4d4a4c6fae327e08bf68258d
>>>>>>> 2ac321230986c4c0eddfbc755c4cf8bab0359016
    return res.status(200).json({
      success: true,

      opening,

      balance,

      rate,

      totalAdded,

      totalDeducted,

<<<<<<< HEAD
      transactions: transactionsWithBalances,
=======
<<<<<<< HEAD
      transactions: transactionsWithBalances,
=======
<<<<<<< HEAD
      transactions: transactionsWithBalances,
=======
<<<<<<< HEAD
      transactions: transactionsWithBalances,
=======
      transactions,
>>>>>>> 542a8888f8fc1a8b362d8b1e4f28d43200e75905
>>>>>>> c4e8e137fe0c3193200dc50d8324092cbbd50d6d
>>>>>>> 91f348a6e92d41be4d4a4c6fae327e08bf68258d
>>>>>>> 2ac321230986c4c0eddfbc755c4cf8bab0359016
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