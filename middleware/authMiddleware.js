const jwt = require("jsonwebtoken");
const db = require("../config/db");

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    // Demo account: every db.query/execute/getConnection call made for
    // the rest of this request is transparently routed to the separate
    // demo database (see config/db.js), so nothing the demo user does
    // ever touches real business data.
    if (decoded.role === "demo" && db.demoPool) {
      return db.runAsDemo(() => next());
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};
