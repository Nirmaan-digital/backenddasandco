const express = require("express");

const {
  getAnalytics,
  getOrdersAnalytics,
  getExpensesAnalytics,
  getGoldAnalyticsData,
  getRevenueAnalyticsData,
  getCalendarAnalyticsData,
} = require("../controllers/analyticsController");

const router = express.Router();

// =====================================================
// SUMMARY
// =====================================================

router.get(
  "/summary",
  getAnalytics
);

// =====================================================
// ORDERS
// =====================================================

router.get(
  "/orders",
  getOrdersAnalytics
);

// =====================================================
// EXPENSES
// =====================================================

router.get(
  "/expenses",
  getExpensesAnalytics
);

// =====================================================
// GOLD
// =====================================================

router.get(
  "/gold",
  getGoldAnalyticsData
);

// =====================================================
// REVENUE
// =====================================================

router.get(
  "/revenue",
  getRevenueAnalyticsData
);

// =====================================================
// CALENDAR
// =====================================================

router.get(
  "/calendar",
  getCalendarAnalyticsData
);

module.exports = router;