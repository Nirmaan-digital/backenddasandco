const db = require("../config/db");

const earnedExpr = `ROUND(CASE WHEN COALESCE(o.gold_earned,0)>0 THEN o.gold_earned ELSE COALESCE(NULLIF(o.gross_weight,0),o.net_gold_weight,0)*COALESCE(NULLIF(o.wastage_percent,0),c.default_percentage,2)/100 END,3)`;
const weightExpr = `COALESCE(NULLIF(o.gross_weight,0),o.net_gold_weight,0)`;
// Only orders that have actually been marked Completed count toward gold
// designed / earnings figures anywhere on the Dashboard, Reports or
// Analytics pages — a Pending/In Progress order hasn't been delivered yet,
// so it shouldn't inflate performance totals until it's completed.
const COMPLETED = `o.status IN ('Completed','Delivered')`;

const fmt = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const startOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

// =====================================================
// EARNINGS BETWEEN TWO DATES (INCLUSIVE) — COMPLETED ONLY
// =====================================================
const sumEarnings = async (start, end) => {
  const [[row]] = await db.query(
    `SELECT COALESCE(SUM(${earnedExpr}),0) total FROM orders o LEFT JOIN clients c ON c.id=o.client_id WHERE DATE(o.created_at) BETWEEN ? AND ? AND ${COMPLETED}`,
    [start, end]
  );
  return Number(row.total || 0);
};

// =====================================================
// TOP-LEVEL SUMMARY
// =====================================================
const getSummary = async () => {
  const today = new Date();
  const todayStr = fmt(today);

  const weekStart = fmt(startOfWeek(today));
  const monthStart = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
  const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
  const quarterStart = fmt(new Date(today.getFullYear(), quarterStartMonth, 1));
  const halfStartMonth = today.getMonth() < 6 ? 0 : 6;
  const halfYearStart = fmt(new Date(today.getFullYear(), halfStartMonth, 1));
  const yearStart = fmt(new Date(today.getFullYear(), 0, 1));

  const [todayEarn, weekEarn, monthEarn, quarterEarn, halfYearEarn, yearEarn] = await Promise.all([
    sumEarnings(todayStr, todayStr),
    sumEarnings(weekStart, todayStr),
    sumEarnings(monthStart, todayStr),
    sumEarnings(quarterStart, todayStr),
    sumEarnings(halfYearStart, todayStr),
    sumEarnings(yearStart, todayStr),
  ]);

  const [[orderCounts]] = await db.query(
    `SELECT COUNT(*) totalOrders, SUM(CASE WHEN status IN ('Completed','Delivered') THEN 1 ELSE 0 END) completedOrders FROM orders`
  );
  const [[goldTotals]] = await db.query(
    `SELECT COALESCE(SUM(${weightExpr}),0) totalGoldDesigned, COALESCE(SUM(${earnedExpr}),0) totalEarnings, COUNT(DISTINCT DATE(o.created_at)) workingDays FROM orders o LEFT JOIN clients c ON c.id=o.client_id WHERE ${COMPLETED}`
  );
  const [[castingRow]] = await db.query(
    `SELECT COALESCE(SUM(GREATEST(COALESCE(gold_given,0)-COALESCE(gold_returned,0),0)),0) castingLoss FROM expenses WHERE category='Casting'`
  );
  const [[printingRow]] = await db.query(
    `SELECT COALESCE(SUM(amount),0) printingExpense FROM expenses WHERE category='3D Printing'`
  );

  const [settingsRows] = await db.query(`SELECT opening_gold_balance, rate_22k FROM business_settings LIMIT 1`);
  const [balanceRows] = await db.query(`SELECT balance_after FROM gold_transactions ORDER BY id DESC LIMIT 1`);
  const currentGold = balanceRows.length
    ? Number(balanceRows[0].balance_after || 0)
    : Number(settingsRows[0]?.opening_gold_balance || 0);
  const rate22k = Number(settingsRows[0]?.rate_22k || 0);

  const totalOrders = Number(orderCounts.totalOrders || 0);
  const completedOrders = Number(orderCounts.completedOrders || 0);
  const totalGoldDesigned = Number(goldTotals.totalGoldDesigned || 0);
  const totalEarnings = Number(goldTotals.totalEarnings || 0);
  const workingDays = Number(goldTotals.workingDays || 0);
  const castingLoss = Number(castingRow.castingLoss || 0);
  const printingExpense = Number(printingRow.printingExpense || 0);
  const netProfitGrams = Number((totalEarnings - castingLoss).toFixed(3));

  const [monthClient] = await db.query(
    `SELECT c.client_name name, COALESCE(SUM(${earnedExpr}),0) earnings FROM orders o LEFT JOIN clients c ON c.id=o.client_id WHERE DATE(o.created_at) BETWEEN ? AND ? AND ${COMPLETED} GROUP BY c.id ORDER BY earnings DESC LIMIT 1`,
    [monthStart, todayStr]
  );
  const [yearClient] = await db.query(
    `SELECT c.client_name name, COALESCE(SUM(${earnedExpr}),0) earnings FROM orders o LEFT JOIN clients c ON c.id=o.client_id WHERE DATE(o.created_at) BETWEEN ? AND ? AND ${COMPLETED} GROUP BY c.id ORDER BY earnings DESC LIMIT 1`,
    [yearStart, todayStr]
  );

  return {
    today: todayEarn,
    week: weekEarn,
    month: monthEarn,
    quarter: quarterEarn,
    halfYear: halfYearEarn,
    year: yearEarn,
    totalOrders,
    completedOrders,
    avgWorkingDay: workingDays > 0 ? Number((totalEarnings / workingDays).toFixed(3)) : 0,
    totalGoldDesigned,
    totalEarnings,
    castingLoss,
    printingExpense,
    netProfitGrams,
    rate22k,
    netProfitValue: rate22k ? Number((netProfitGrams * rate22k).toFixed(2)) : 0,
    bestClientMonth: monthClient[0] ? { name: monthClient[0].name, earnings: Number(monthClient[0].earnings || 0) } : null,
    bestClientYear: yearClient[0] ? { name: yearClient[0].name, earnings: Number(yearClient[0].earnings || 0) } : null,
    openingGold: currentGold,
  };
};

// =====================================================
// DAILY EARNINGS · LAST 14 DAYS — COMPLETED ONLY
// =====================================================
const getDaily = async () => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 13);
  const [rows] = await db.query(
    `SELECT DATE(o.created_at) date, COALESCE(SUM(${earnedExpr}),0) earnings FROM orders o LEFT JOIN clients c ON c.id=o.client_id WHERE DATE(o.created_at) BETWEEN ? AND ? AND ${COMPLETED} GROUP BY DATE(o.created_at)`,
    [fmt(start), fmt(today)]
  );
  const map = new Map(rows.map((r) => [String(r.date).slice(0, 10), Number(r.earnings || 0)]));
  const out = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = fmt(d);
    out.push({ date: key, earnings: map.get(key) || 0 });
  }
  return out;
};

// =====================================================
// WEEKLY EARNINGS · LAST 8 WEEKS — COMPLETED ONLY
// =====================================================
const getWeekly = async () => {
  const today = new Date();
  const currentWeekStart = startOfWeek(today);
  const firstWeekStart = new Date(currentWeekStart);
  firstWeekStart.setDate(firstWeekStart.getDate() - 7 * 7);
  const out = [];
  for (let i = 0; i < 8; i++) {
    const ws = new Date(firstWeekStart);
    ws.setDate(ws.getDate() + i * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    const earnings = await sumEarnings(fmt(ws), fmt(we));
    out.push({ weekStart: fmt(ws), earnings });
  }
  return out;
};

// =====================================================
// MONTHLY EARNINGS · LAST 12 MONTHS — COMPLETED ONLY
// =====================================================
const getMonthly = async () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const [rows] = await db.query(
    `SELECT DATE_FORMAT(o.created_at,'%Y-%m') monthKey, COALESCE(SUM(${earnedExpr}),0) earnings FROM orders o LEFT JOIN clients c ON c.id=o.client_id WHERE DATE(o.created_at) >= ? AND ${COMPLETED} GROUP BY monthKey`,
    [fmt(start)]
  );
  const map = new Map(rows.map((r) => [r.monthKey, Number(r.earnings || 0)]));
  const out = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ monthKey: key, earnings: map.get(key) || 0 });
  }
  return out;
};

// =====================================================
// MONTHLY CASTING LOSS · LAST 12 MONTHS
// (expense-based, not order-status-based — unaffected)
// =====================================================
const getMonthlyLoss = async () => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  const [rows] = await db.query(
    `SELECT DATE_FORMAT(expense_date,'%Y-%m') monthKey, COALESCE(SUM(GREATEST(COALESCE(gold_given,0)-COALESCE(gold_returned,0),0)),0) castingLoss FROM expenses WHERE category='Casting' AND expense_date >= ? GROUP BY monthKey`,
    [fmt(start)]
  );
  const map = new Map(rows.map((r) => [r.monthKey, Number(r.castingLoss || 0)]));
  const out = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ monthKey: key, castingLoss: map.get(key) || 0 });
  }
  return out;
};

// =====================================================
// TOP 10 CLIENTS THIS MONTH — COMPLETED ONLY
// =====================================================
const getTopClientsMonth = async () => {
  const today = new Date();
  const monthStart = fmt(new Date(today.getFullYear(), today.getMonth(), 1));
  const [rows] = await db.query(
    `SELECT c.id, c.client_name name, COALESCE(SUM(${earnedExpr}),0) earnings FROM orders o LEFT JOIN clients c ON c.id=o.client_id WHERE DATE(o.created_at) BETWEEN ? AND ? AND ${COMPLETED} GROUP BY c.id ORDER BY earnings DESC LIMIT 10`,
    [monthStart, fmt(today)]
  );
  return rows.map((r) => ({ name: r.name, earnings: Number(r.earnings || 0) }));
};

// =====================================================
// NOTIFICATIONS
// =====================================================
const getNotifications = async () => {
  const todayStr = fmt(new Date());
  const [[ordersToday]] = await db.query(
    `SELECT COUNT(*) count FROM orders WHERE status IN ('Completed','Delivered') AND DATE(delivery_date)=?`,
    [todayStr]
  );
  const earningsToday = await sumEarnings(todayStr, todayStr);
  const topClients = await getTopClientsMonth();
  return {
    ordersToday: Number(ordersToday.count || 0),
    earningsToday,
    bestClientMonth: topClients[0]?.name || null,
  };
};

// =====================================================
// CLIENT LEADERBOARD (RANKED BY EARNINGS) — COMPLETED ONLY
// orders_count still counts every order (so you can see a client's full
// workload), but gold designed / earnings only reflect completed work.
// =====================================================
const getRecentClients = async () => {
  const [rows] = await db.query(`
    SELECT c.id, c.client_name, COUNT(o.id) orders_count,
      COALESCE(SUM(CASE WHEN o.status IN ('Completed','Delivered') THEN ${weightExpr} ELSE 0 END),0) gold_designed,
      COALESCE(SUM(CASE WHEN o.status IN ('Completed','Delivered') THEN ${earnedExpr} ELSE 0 END),0) earnings
    FROM clients c
    LEFT JOIN orders o ON o.client_id = c.id
    GROUP BY c.id
    HAVING orders_count > 0
    ORDER BY earnings DESC, orders_count DESC
    LIMIT 10
  `);
  return rows;
};

const getDashboardData = async () => {
  const [summary, daily, weekly, monthly, monthlyLoss, topClientsMonth, notifications, recentClients] = await Promise.all([
    getSummary(),
    getDaily(),
    getWeekly(),
    getMonthly(),
    getMonthlyLoss(),
    getTopClientsMonth(),
    getNotifications(),
    getRecentClients(),
  ]);
  return { summary, daily, weekly, monthly, monthlyLoss, topClientsMonth, notifications, recentClients };
};

module.exports = { getDashboardData };
