const bcrypt = require("bcrypt");
const {
  createUser,
  findUserByEmail,
} = require("../models/userModel");

const { generateToken } = require("../utils/jwt");

// ==========================
// REGISTER
// ==========================
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please fill all fields",
      });
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = await createUser(
      name,
      email,
      hashedPassword,
      role || "admin"
    );

    const token = generateToken({
      id: userId,
      email,
      role: role || "admin",
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: userId,
        name,
        email,
        role: role || "admin",
      },
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// LOGIN
// ==========================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================
// CURRENT USER (/me)
// ==========================
const me = async (req, res) => {
  try {
    return res.json({
      success: true,
      user: req.user,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ==========================
// LOGOUT
// ==========================
const logout = async (req, res) => {
  return res.json({
    success: true,
    message: "Logout successful",
  });
};

module.exports = {
  register,
  login,
  me,
  logout,
};