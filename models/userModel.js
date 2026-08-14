const db = require("../config/db");

async function findUserByEmail(email) {
  const [rows] = await db.execute(
    "SELECT * FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  return rows.length ? rows[0] : null;
}

async function createUser(name, email, password, role = "admin") {
  const [result] = await db.execute(
    `INSERT INTO users (name, email, password, role)
     VALUES (?, ?, ?, ?)`,
    [name, email, password, role]
  );

  return result.insertId;
}

async function findUserById(id) {
  const [rows] = await db.execute(
    "SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1",
    [id]
  );

  return rows.length ? rows[0] : null;
}

module.exports = {
  findUserByEmail,
  createUser,
  findUserById,
};