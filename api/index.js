function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return;

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Accept"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS"
  );
}

let app;
let bootError;

try {
  app = require("../server");
} catch (error) {
  bootError = error;
  console.error("BACKEND BOOT FAILED");
  console.error(error);
}

module.exports = (req, res) => {
  if (bootError) {
    applyCors(req, res);
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: false,
        message: bootError.message || "Backend failed to start",
      })
    );
    return;
  }

  return app(req, res);
};
