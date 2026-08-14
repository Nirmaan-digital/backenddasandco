const { getDashboardData } = require("../models/dashboardModel");

const getDashboard = async (req, res) => {
  try {
    const data = await getDashboardData();

    res.status(200).json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getDashboard,
};
