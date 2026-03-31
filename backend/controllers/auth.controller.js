const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../models/User.model');

// ─── Generate JWT ─────────────────────────────────────────
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const toPublicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || '',
  plan: user.plan,
  workspace: user.workspace,
  responsesUsed: user.responsesUsed,
  responsesLimit: user.responsesLimit,
});

const removeLocalAvatarIfExists = (avatarPath) => {
  if (!avatarPath || !avatarPath.startsWith('/uploads/avatars/')) return;
  const absolutePath = path.join(__dirname, '..', avatarPath.replace(/^\//, ''));
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

// ─── POST /api/auth/register ──────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user: toPublicUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/auth/google ────────────────────────────────
exports.googleAuth = async (req, res) => {
  try {
    const { name, email, googleId } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name, email, googleId });
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: toPublicUser(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/auth/me/avatar ────────────────────────────
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No avatar image uploaded' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    removeLocalAvatarIfExists(user.avatar);

    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    return res.json({
      success: true,
      message: 'Profile photo updated',
      user: toPublicUser(user),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/auth/me/avatar ──────────────────────────
exports.removeAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    removeLocalAvatarIfExists(user.avatar);
    user.avatar = '';
    await user.save();

    return res.json({
      success: true,
      message: 'Profile photo removed',
      user: toPublicUser(user),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
