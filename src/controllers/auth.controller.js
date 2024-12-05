import { User as userModel } from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const register = async (req, res) => {
  const { username, email, password, avatar } = req.body;
  try {
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: "Bad request: Missing required fields" });
    }
    const isUserExists = await userModel.findOne({
      $or: [{ username: username }, { email: email }],
    });

    if (isUserExists) {
      return res
        .status(409)
        .json({ error: "Username or email already exists" });
    }

    const newUser = new userModel({
      username: username,
      email: email,
      password: password,
      avatar: avatar,
    });

    await newUser.save();

    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error while saving the user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
export const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Bad request: Username or password missing" });
    }

    const isUserExists = await userModel.findOne({ username: username });
    if (!isUserExists) {
      return res.status(404).json({ error: "Username not found" });
    }

    const isPassMatch = await bcrypt.compare(password, isUserExists.password);
    if (!isPassMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const refreshToken = await jwt.sign(
      {
        userId: isUserExists._id,
        username: isUserExists.username,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2d" }
    );

    return res
      .status(200)
      .cookie("refToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // Secure in production
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict", // Adjust for cross-domain if needed
        path: "/", // Ensure the cookie is accessible throughout the app
        maxAge: 24 * 60 * 60 * 1000, // 1 day
      })
      .json({ success: "Successfully logged in" });
  } catch (error) {
    console.error("Login Error: ", error.message); // Log the error for better debugging
    return res.status(500).json({
      error: "Error while logging in",
      details: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    const user = req.user;

    await userModel.findByIdAndUpdate(user._id, { status: "offline" });

    res
      .status(200)
      .clearCookie("refToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
        path: "/",
        maxAge: 0,
      })
      .json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ error: "Logout failed", details: error.message });
  }
};
