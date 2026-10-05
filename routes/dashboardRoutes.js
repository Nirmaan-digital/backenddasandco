const express = require("express");
const router = express.Router();

const { getDashboard } = require("../controllers/dashboardController");

// GET Dashboard Data
router.get("/", getDashboard);

module.exports = router;