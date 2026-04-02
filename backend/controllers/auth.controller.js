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
  firstName: user.firstName,
  lastName: user.lastName,
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

    // Parse name into first and last name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const user = await User.create({ 
      firstName,
      lastName,
      name, 
      email, 
      password 
    });
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
    const user = await User.findById(req.user._id);
    res.json({ success: true, user: toPublicUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const fetchGoogleProfile = async (accessToken) => {
  try {
    const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google userinfo error:', response.status, errorText);
      throw new Error(`Google API error: ${response.status}`);
    }

    const profile = await response.json();
    console.log('Google profile fetched:', profile.email);
    
    // Parse name into first and last name
    const nameParts = (profile.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    return {
      firstName: firstName,
      lastName: lastName,
      name: profile.name || '',
      email: profile.email || '',
      googleId: profile.id || '',
      avatar: profile.picture || '',
    };
  } catch (err) {
    console.error('Failed to fetch Google profile:', err.message);
    throw new Error('Unable to verify Google token. Please try again.');
  }
};

// ─── POST /api/auth/google ────────────────────────────────
exports.googleAuth = async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Google access token is required' });
    }

    // Fetch user profile using access token
    const { firstName, lastName, name, email, googleId, avatar } = await fetchGoogleProfile(accessToken);

    if (!email) {
      return res.status(400).json({ success: false, message: 'Could not retrieve email from Google' });
    }

    let user = await User.findOne({ email });
    
    if (!user) {
      // Auto-register via Google
      console.log('Creating new user from Google auth:', email);
      user = await User.create({ 
        firstName,
        lastName,
        name, 
        email, 
        googleId, 
        avatar,
        workspace: { name: `${name}'s Workspace` }
      });
    } else {
      // Update existing user with latest Google profile info
      user.avatar = avatar;
      if (!user.firstName) user.firstName = firstName;
      if (!user.lastName) user.lastName = lastName;
      await user.save();
    }

    const jwtToken = generateToken(user._id);

    res.json({
      success: true,
      token: jwtToken,
      user: toPublicUser(user),
    });
  } catch (err) {
    console.error('Google Auth Error:', err.message);
    res.status(401).json({ success: false, message: err.message || 'Invalid or expired Google token' });
  }
};

// ─── POST /api/auth/me/avatar ────────────────────────────
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No avatar image uploaded' });
    }

    const user = await User.findById(req.user._id);
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
    const user = await User.findById(req.user._id);
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
