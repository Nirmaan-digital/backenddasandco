const express = require("express");

const router = express.Router();

const {
  getOrders,
  getOrder,
  addOrder,
  editOrder,
  removeOrder,
} = require("../controllers/orderController");

const authMiddleware =
  require("../middleware/authMiddleware");

// =================================
// GET ALL ORDERS
// =================================

router.get(
  "/",
  authMiddleware,
  getOrders
);

// =================================
// GET SINGLE ORDER
// =================================

router.get(
  "/:id",
  authMiddleware,
  getOrder
);

// =================================
// CREATE ORDER
// =================================

router.post(
  "/",
  authMiddleware,
  addOrder
);

// =================================
// UPDATE ORDER
// =================================

router.put(
  "/:id",
  authMiddleware,
  editOrder
);

// =================================
// DELETE ORDER
// =================================

router.delete(
  "/:id",
  authMiddleware,
  removeOrder
);

module.exports = router;