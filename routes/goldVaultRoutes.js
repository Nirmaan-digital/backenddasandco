const express = require("express");

const router =
  express.Router();

const {
  getTransactions,
  addTransaction,
  removeTransaction,
} = require("../controllers/goldVaultController");

// GET GOLD VAULT
router.get(
  "/",
  getTransactions
);

// ADD TRANSACTION
router.post(
  "/",
  addTransaction
);

// DELETE TRANSACTION
router.delete(
  "/:id",
  removeTransaction
);

module.exports = router;