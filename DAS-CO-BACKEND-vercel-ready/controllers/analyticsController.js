const {
  getAnalyticsSummary,
  getOrderAnalytics,
  getExpenseAnalytics,
  getGoldAnalytics,
  getRevenueAnalytics,
  getCalendarAnalytics,
} = require("../models/analyticsModel");

// =====================================================
// SUMMARY
// =====================================================

const getAnalytics = async (req, res) => {
  try {
    const period =
      req.query.period || "month";

    const data =
      await getAnalyticsSummary(period);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Analytics Summary Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to load analytics",
    });
  }
};

// =====================================================
// ORDERS
// =====================================================

const getOrdersAnalytics = async (
  req,
  res
) => {
  try {
    const period =
      req.query.period || "month";

    const data =
      await getOrderAnalytics(period);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Order Analytics Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to load order analytics",
    });
  }
};

// =====================================================
// EXPENSES
// =====================================================

const getExpensesAnalytics = async (
  req,
  res
) => {
  try {
    const period =
      req.query.period || "month";

    const data =
      await getExpenseAnalytics(period);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Expense Analytics Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to load expense analytics",
    });
  }
};

// =====================================================
// GOLD
// =====================================================

const getGoldAnalyticsData = async (
  req,
  res
) => {
  try {
    const period =
      req.query.period || "month";

    const data =
      await getGoldAnalytics(period);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Gold Analytics Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to load gold analytics",
    });
  }
};

// =====================================================
// REVENUE
// =====================================================

const getRevenueAnalyticsData = async (
  req,
  res
) => {
  try {
    const period =
      req.query.period || "month";

    const data =
      await getRevenueAnalytics(period);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Revenue Analytics Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to load revenue analytics",
    });
  }
};

// =====================================================
// CALENDAR
// =====================================================

const getCalendarAnalyticsData = async (
  req,
  res
) => {
  try {
    const period =
      req.query.period || "month";

    const data =
      await getCalendarAnalytics(period);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "Calendar Analytics Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to load calendar analytics",
    });
  }
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  getAnalytics,
  getOrdersAnalytics,
  getExpensesAnalytics,
  getGoldAnalyticsData,
  getRevenueAnalyticsData,
  getCalendarAnalyticsData,
};