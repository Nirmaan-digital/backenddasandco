const express = require("express");

const router = express.Router();

const {
  getClients,
  getClient,
  addClient,
  editClient,
  removeClient,
} = require("../controllers/clientController");

const verifyToken = require("../middleware/authMiddleware");

router.get("/", verifyToken, getClients);

router.get("/:id", verifyToken, getClient);

router.post("/", verifyToken, addClient);

router.put("/:id", verifyToken, editClient);

router.delete("/:id", verifyToken, removeClient);

module.exports = router;