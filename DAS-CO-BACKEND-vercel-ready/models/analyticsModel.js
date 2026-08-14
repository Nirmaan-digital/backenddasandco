const db = require("../config/db");

// =====================================================
// PERIOD DATE RANGE
// =====================================================

const getPeriodRange = (period = "month") => {
  const now = new Date();

  // Local date only
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  let startDate;
  let endDate;

  switch (period) {
    // =================================================
    // DAY
    // =================================================

    case "day":
      startDate = new Date(today);
      endDate = new Date(today);
      break;

    // =================================================
    // WEEK
    // MONDAY TO SUNDAY
    // =================================================

    case "week": {
      const day = today.getDay();

      const diff =
        day === 0
          ? -6
          : 1 - day;

      startDate = new Date(today);

      startDate.setDate(
        today.getDate() + diff
      );

      endDate = new Date(startDate);

      endDate.setDate(
        startDate.getDate() + 6
      );

      break;
    }

    // =================================================
    // MONTH
    // =================================================

    case "month":
      startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      );

      break;

    // =================================================
    // QUARTER
    // =================================================

    case "quarter": {
      const quarterStartMonth =
        Math.floor(
          today.getMonth() / 3
        ) * 3;

      startDate = new Date(
        today.getFullYear(),
        quarterStartMonth,
        1
      );

      endDate = new Date(
        today.getFullYear(),
        quarterStartMonth + 3,
        0
      );

      break;
    }

    // =================================================
    // HALF YEAR
    // =================================================

    case "half-year": {
      const halfStartMonth =
        today.getMonth() < 6
          ? 0
          : 6;

      startDate = new Date(
        today.getFullYear(),
        halfStartMonth,
        1
      );

      endDate = new Date(
        today.getFullYear(),
        halfStartMonth + 6,
        0
      );

      break;
    }

    // =================================================
    // YEAR
    // =================================================

    case "year":
      startDate = new Date(
        today.getFullYear(),
        0,
        1
      );

      endDate = new Date(
        today.getFullYear(),
        11,
        31
      );

      break;

    // =================================================
    // DEFAULT
    // =================================================

    default:
      startDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      endDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      );
  }

  const formatDate = (date) => {
    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
};

// =====================================================
// ANALYTICS SUMMARY
// =====================================================

const getAnalyticsSummary = async (
  period = "month"
) => {
  const {
    startDate,
    endDate,
  } = getPeriodRange(period);

  // ===================================================
  // CLIENTS
  // ===================================================

  const [[clients]] =
    await db.query(
      `
      SELECT COUNT(*) AS totalClients
      FROM clients
      WHERE DATE(created_at)
      BETWEEN ? AND ?
      `,
      [startDate, endDate]
    );

  // ===================================================
  // ORDERS
  // ===================================================

  const [[orders]] =
    await db.query(
      `
      SELECT COUNT(*) AS totalOrders
      FROM orders
      WHERE DATE(created_at)
      BETWEEN ? AND ?
      `,
      [startDate, endDate]
    );

  // ===================================================
  // PENDING ORDERS
  // ===================================================

  const [[pending]] =
    await db.query(
      `
      SELECT COUNT(*) AS pendingOrders
      FROM orders
      WHERE status = 'Pending'
      AND DATE(created_at)
      BETWEEN ? AND ?
      `,
      [startDate, endDate]
    );

  // ===================================================
  // COMPLETED / DELIVERED ORDERS
  // ===================================================

  const [[completed]] =
    await db.query(
      `
      SELECT COUNT(*) AS completedOrders
      FROM orders
      WHERE status IN ('Completed', 'Delivered')
      AND DATE(created_at)
      BETWEEN ? AND ?
      `,
      [startDate, endDate]
    );

  // ===================================================
  // GOLD EARNED
  // ===================================================

  const [[gold]] =
    await db.query(
      `
      SELECT
        IFNULL(
          SUM(gold_earned),
          0
        ) AS totalGoldEarned
      FROM orders
      WHERE DATE(created_at)
      BETWEEN ? AND ?
      `,
      [startDate, endDate]
    );

  // ===================================================
  // EXPENSES
  // ===================================================

  const [[expenses]] =
    await db.query(
      `
      SELECT
        IFNULL(
          SUM(amount),
          0
        ) AS totalExpenses
      FROM expenses
      WHERE expense_date
      BETWEEN ? AND ?
      `,
      [startDate, endDate]
    );

  // ===================================================
  // REVENUE
  // ===================================================

  const [[revenue]] =
    await db.query(
      `
      SELECT
        IFNULL(
          SUM(labour_charge),
          0
        ) AS totalRevenue
      FROM orders
      WHERE DATE(created_at)
      BETWEEN ? AND ?
      `,
      [startDate, endDate]
    );

  // ===================================================
  // GOLD BALANCE
  // ===================================================

  const [goldRows] =
    await db.query(
      `
      SELECT
        balance_after
      FROM gold_transactions
      WHERE DATE(transaction_date)
      <= ?
      ORDER BY
        transaction_date DESC,
        id DESC
      LIMIT 1
      `,
      [endDate]
    );

  let goldBalance = 0;

  if (goldRows.length > 0) {
    goldBalance =
      Number(
        goldRows[0].balance_after
      ) || 0;
  } else {
    const [settings] =
      await db.query(
        `
        SELECT
          opening_gold_balance
        FROM business_settings
        LIMIT 1
        `
      );

    if (settings.length > 0) {
      goldBalance =
        Number(
          settings[0]
            .opening_gold_balance
        ) || 0;
    }
  }

  const totalRevenue =
    Number(
      revenue.totalRevenue
    ) || 0;

  const totalExpenses =
    Number(
      expenses.totalExpenses
    ) || 0;

  return {
    period,

    startDate,

    endDate,

    totalClients:
      Number(
        clients.totalClients
      ) || 0,

    totalOrders:
      Number(
        orders.totalOrders
      ) || 0,

    pendingOrders:
      Number(
        pending.pendingOrders
      ) || 0,

    completedOrders:
      Number(
        completed.completedOrders
      ) || 0,

    totalGoldEarned:
      Number(
        gold.totalGoldEarned
      ) || 0,

    totalExpenses,

    totalRevenue,

    profit:
      totalRevenue -
      totalExpenses,

    goldBalance,
  };
};

// =====================================================
// ORDER ANALYTICS
// =====================================================

const getOrderAnalytics = async (
  period = "month"
) => {
  const {
    startDate,
    endDate,
  } = getPeriodRange(period);

  const [rows] =
    await db.query(
      `
      SELECT
        status,
        COUNT(*) AS count
      FROM orders
      WHERE DATE(created_at)
      BETWEEN ? AND ?
      GROUP BY status
      `,
      [startDate, endDate]
    );

  return rows;
};

// =====================================================
// EXPENSE ANALYTICS
// =====================================================

const getExpenseAnalytics = async (
  period = "month"
) => {
  const {
    startDate,
    endDate,
  } = getPeriodRange(period);

  const [rows] =
    await db.query(
      `
      SELECT
        category,

        IFNULL(
          SUM(amount),
          0
        ) AS amount

      FROM expenses

      WHERE expense_date
      BETWEEN ? AND ?

      GROUP BY category

      ORDER BY amount DESC
      `,
      [startDate, endDate]
    );

  return rows;
};

// =====================================================
// GOLD ANALYTICS
// =====================================================

const getGoldAnalytics = async (
  period = "month"
) => {
  const {
    startDate,
    endDate,
  } = getPeriodRange(period);

  // ===================================================
  // GOLD TRANSACTIONS
  // ===================================================

  const [rows] =
    await db.query(
      `
      SELECT

        DATE(transaction_date) AS date,

        IFNULL(
          SUM(gold_added),
          0
        ) AS added,

        IFNULL(
          SUM(gold_deducted),
          0
        ) AS used

      FROM gold_transactions

      WHERE DATE(transaction_date)
      BETWEEN ? AND ?

      GROUP BY DATE(transaction_date)

      ORDER BY DATE(transaction_date) ASC
      `,
      [startDate, endDate]
    );

  // ===================================================
  // OPENING BALANCE
  // ===================================================

  const [settings] =
    await db.query(
      `
      SELECT
        opening_gold_balance
      FROM business_settings
      LIMIT 1
      `
    );

  let openingBalance = 0;

  if (settings.length > 0) {
    openingBalance =
      Number(
        settings[0]
          .opening_gold_balance
      ) || 0;
  }

  // ===================================================
  // BALANCE BEFORE PERIOD
  // ===================================================

  const [beforeRows] =
    await db.query(
      `
      SELECT
        balance_after
      FROM gold_transactions

      WHERE DATE(transaction_date)
      < ?

      ORDER BY
        transaction_date DESC,
        id DESC

      LIMIT 1
      `,
      [startDate]
    );

  if (beforeRows.length > 0) {
    openingBalance =
      Number(
        beforeRows[0].balance_after
      ) || 0;
  }

  // ===================================================
  // CREATE DAILY MAP
  // ===================================================

  const daily = {};

  rows.forEach((row) => {
    const date =
      String(row.date).substring(0, 10);

    daily[date] = {
      date,

      added:
        Number(row.added) || 0,

      used:
        Number(row.used) || 0,

      balance: 0,
    };
  });

  // ===================================================
  // RUNNING BALANCE
  // ===================================================

  let runningBalance =
    openingBalance;

  const data = Object.values(daily)
    .sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    )
    .map((item) => {
      runningBalance =
        runningBalance +
        Number(item.added || 0) -
        Number(item.used || 0);

      return {
        date: item.date,

        balance:
          Number(
            runningBalance
          ),

        added:
          Number(item.added || 0),

        used:
          Number(item.used || 0),
      };
    });

  // ===================================================
  // CURRENT BALANCE
  // ===================================================

  let currentBalance =
    openingBalance;

  if (data.length > 0) {
    currentBalance =
      Number(
        data[data.length - 1]
          .balance
      );
  } else {
    const [latestRows] =
      await db.query(
        `
        SELECT
          balance_after
        FROM gold_transactions

        WHERE DATE(transaction_date)
        <= ?

        ORDER BY
          transaction_date DESC,
          id DESC

        LIMIT 1
        `,
        [endDate]
      );

    if (latestRows.length > 0) {
      currentBalance =
        Number(
          latestRows[0]
            .balance_after
        ) || 0;
    }
  }

  return {
    period,

    startDate,

    endDate,

    currentBalance,

    data,
  };
};

// =====================================================
// REVENUE ANALYTICS
// =====================================================

const getRevenueAnalytics = async (
  period = "month"
) => {
  const {
    startDate,
    endDate,
  } = getPeriodRange(period);

  // ===================================================
  // ORDERS / REVENUE
  // ===================================================

  const [orderRows] =
    await db.query(
      `
      SELECT

        DATE(created_at) AS date,

        IFNULL(
          SUM(labour_charge),
          0
        ) AS revenue,

        IFNULL(
          SUM(gold_earned),
          0
        ) AS goldEarned

      FROM orders

      WHERE DATE(created_at)
      BETWEEN ? AND ?

      GROUP BY DATE(created_at)

      ORDER BY DATE(created_at) ASC
      `,
      [startDate, endDate]
    );

  // ===================================================
  // EXPENSES
  // ===================================================

  const [expenseRows] =
    await db.query(
      `
      SELECT

        expense_date AS date,

        IFNULL(
          SUM(amount),
          0
        ) AS expenses

      FROM expenses

      WHERE expense_date
      BETWEEN ? AND ?

      GROUP BY expense_date

      ORDER BY expense_date ASC
      `,
      [startDate, endDate]
    );

  // ===================================================
  // MERGE DATA
  // ===================================================

  const map = {};

  orderRows.forEach((row) => {
    const date =
      String(row.date)
        .substring(0, 10);

    if (!map[date]) {
      map[date] = {
        date,

        revenue: 0,

        expenses: 0,

        profit: 0,

        goldEarned: 0,
      };
    }

    map[date].revenue =
      Number(row.revenue) || 0;

    map[date].goldEarned =
      Number(row.goldEarned) || 0;
  });

  expenseRows.forEach((row) => {
    const date =
      String(row.date)
        .substring(0, 10);

    if (!map[date]) {
      map[date] = {
        date,

        revenue: 0,

        expenses: 0,

        profit: 0,

        goldEarned: 0,
      };
    }

    map[date].expenses =
      Number(row.expenses) || 0;
  });

  // ===================================================
  // FINAL DATA
  // ===================================================

  return Object.values(map)
    .map((item) => ({
      ...item,

      profit:
        Number(item.revenue || 0) -
        Number(item.expenses || 0),
    }))
    .sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );
};

// =====================================================
// ACTIVITY CALENDAR
// =====================================================

const getCalendarAnalytics = async (
  period = "month"
) => {
  const {
    startDate,
    endDate,
  } = getPeriodRange(period);

  // ===================================================
  // ORDERS
  // ===================================================

  const [orderRows] =
    await db.query(
      `
      SELECT
        id,
        DATE(created_at) AS date,
        order_number,
        client_id,
        project_name,
        category,
        gold_weight,
        percentage,
        earning_gold,
        gold_earned,
        gross_weight,
        stone_weight,
        net_gold_weight,
        wastage_percent,
        labour_charge,
        delivery_date,
        status,
        created_at

      FROM orders

      WHERE DATE(created_at)
      BETWEEN ? AND ?

      ORDER BY
        created_at ASC,
        id ASC
      `,
      [startDate, endDate]
    );

  // ===================================================
  // EXPENSES
  // ===================================================

  const [expenseRows] =
    await db.query(
      `
      SELECT

        expense_date AS date,

        COUNT(*) AS expenseEntries,

        IFNULL(
          SUM(amount),
          0
        ) AS expenses

      FROM expenses

      WHERE expense_date
      BETWEEN ? AND ?

      GROUP BY expense_date

      ORDER BY expense_date ASC
      `,
      [startDate, endDate]
    );

  // ===================================================
  // GOLD TRANSACTIONS
  // ===================================================

  const [goldRows] =
    await db.query(
      `
      SELECT

        DATE(transaction_date) AS date,

        COUNT(*) AS goldTransactions,

        IFNULL(
          SUM(gold_added),
          0
        ) AS goldAdded,

        IFNULL(
          SUM(gold_deducted),
          0
        ) AS goldUsed

      FROM gold_transactions

      WHERE DATE(transaction_date)
      BETWEEN ? AND ?

      GROUP BY DATE(transaction_date)

      ORDER BY DATE(transaction_date) ASC
      `,
      [startDate, endDate]
    );

  // ===================================================
  // ACTIVITY MAP
  // ===================================================

  const activity = {};

  const createActivity = (date) => {
    if (!activity[date]) {
      activity[date] = {
        date,

        orders: 0,

        orderDetails: [],

        revenue: 0,

        expenses: 0,

        goldAdded: 0,

        goldUsed: 0,

        profit: 0,
      };
    }

    return activity[date];
  };

  // ===================================================
  // ORDER DATA
  // ===================================================

  orderRows.forEach((row) => {
    const date =
      String(row.date)
        .substring(0, 10);

    const item =
      createActivity(date);

    // Order count
    item.orders += 1;

    // Revenue
    item.revenue +=
      Number(
        row.labour_charge
      ) || 0;

    // Full order details
    item.orderDetails.push({
      id: row.id,

      order_number:
        row.order_number,

      client_id:
        row.client_id,

      project_name:
        row.project_name,

      category:
        row.category,

      gold_weight:
        Number(
          row.gold_weight
        ) || 0,

      percentage:
        Number(
          row.percentage
        ) || 0,

      earning_gold:
        Number(
          row.earning_gold
        ) || 0,

      gold_earned:
        Number(
          row.gold_earned
        ) || 0,

      gross_weight:
        Number(
          row.gross_weight
        ) || 0,

      stone_weight:
        Number(
          row.stone_weight
        ) || 0,

      net_gold_weight:
        Number(
          row.net_gold_weight
        ) || 0,

      wastage_percent:
        Number(
          row.wastage_percent
        ) || 0,

      labour_charge:
        Number(
          row.labour_charge
        ) || 0,

      delivery_date:
        row.delivery_date,

      status:
        row.status,

      created_at:
        row.created_at,
    });
  });

  // ===================================================
  // EXPENSE DATA
  // ===================================================

  expenseRows.forEach((row) => {
    const date =
      String(row.date)
        .substring(0, 10);

    const item =
      createActivity(date);

    item.expenses =
      Number(
        row.expenses
      ) || 0;
  });

  // ===================================================
  // GOLD DATA
  // ===================================================

  goldRows.forEach((row) => {
    const date =
      String(row.date)
        .substring(0, 10);

    const item =
      createActivity(date);

    item.goldAdded =
      Number(
        row.goldAdded
      ) || 0;

    item.goldUsed =
      Number(
        row.goldUsed
      ) || 0;
  });

  // ===================================================
  // CALCULATE PROFIT
  // ===================================================

  Object.values(activity)
    .forEach((item) => {
      item.profit =
        Number(item.revenue || 0) -
        Number(item.expenses || 0);
    });

  // ===================================================
  // RETURN SORTED DATA
  // ===================================================

  return Object.values(activity)
    .sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    );
};

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  getPeriodRange,

  getAnalyticsSummary,

  getOrderAnalytics,

  getExpenseAnalytics,

  getGoldAnalytics,

  getRevenueAnalytics,

  getCalendarAnalytics,
};