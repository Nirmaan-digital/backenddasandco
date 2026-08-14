const {
  ensureClientColumns,
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} = require("../models/clientModel");

const parsePercentage = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 2;
};

const getClients = async (req, res) => {
  try {
    await ensureClientColumns();
    const clients = await getAllClients();
    res.json({ success: true, clients });
  } catch (e) {
    console.error("GET /clients", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

const getClient = async (req, res) => {
  try {
    const client = await getClientById(req.params.id);
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });
    res.json({ success: true, client });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const addClient = async (req, res) => {
  try {
    const name = String(req.body.client_name ?? req.body.name ?? "").trim();
    if (!name) return res.status(400).json({ success: false, message: "Client name is required" });

    const id = await createClient(
      name,
      String(req.body.phone ?? "").trim() || null,
      String(req.body.email ?? "").trim() || null,
      String(req.body.company ?? req.body.address ?? "").trim() || null,
      String(req.body.notes ?? "").trim() || null,
      parsePercentage(req.body.default_percentage)
    );

    const client = await getClientById(id);
    res.status(201).json({ success: true, message: "Client created successfully", id, client });
  } catch (e) {
    console.error("POST /clients", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

const editClient = async (req, res) => {
  try {
    const name = String(req.body.client_name ?? req.body.name ?? "").trim();
    if (!name) return res.status(400).json({ success: false, message: "Client name is required" });

    const existing = await getClientById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Client not found" });

    await updateClient(
      req.params.id,
      name,
      String(req.body.phone ?? "").trim() || null,
      String(req.body.email ?? "").trim() || null,
      String(req.body.company ?? req.body.address ?? "").trim() || null,
      String(req.body.notes ?? "").trim() || null,
      parsePercentage(req.body.default_percentage)
    );

    const client = await getClientById(req.params.id);
    res.json({ success: true, message: "Client updated successfully", client });
  } catch (e) {
    console.error("PUT /clients/:id", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

const removeClient = async (req, res) => {
  try {
    const existing = await getClientById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Client not found" });
    await deleteClient(req.params.id);
    res.json({ success: true, message: "Client deleted successfully", id: Number(req.params.id) });
  } catch (e) {
    console.error("DELETE /clients/:id", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { getClients, getClient, addClient, editClient, removeClient };
