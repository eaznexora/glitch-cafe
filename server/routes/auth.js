const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const Admin = require('../models/Admin');
const { authMiddleware, superAdminMiddleware } = require('../middleware/auth');

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await Admin.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid email or password' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid email or password' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    await user.save();

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'The Glitch Cafe <orders@eazsocial.online>',
      to: email,
      subject: 'Your Login Verification Code - The Glitch Cafe',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f6f6; padding: 32px 16px; text-align: center;">
          <div style="max-width: 440px; margin: 0 auto; background: #ffffff; padding: 36px 28px; border-radius: 14px; border: 1px solid #eaeaea; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
            <h2 style="margin: 0 0 6px; color: #111; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">THE GLITCH CAFE</h2>
            <p style="color: #666; font-size: 13px; margin: 0 0 24px;">Admin Portal Authentication</p>
            <p style="color: #333; font-size: 14px; margin: 0 0 12px;">Use this 6-digit code to complete your login:</p>
            <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #000; padding: 16px; background: #f3f4f6; border-radius: 10px; margin: 16px 0;">
              ${otp}
            </div>
            <p style="color: #888; font-size: 12px; margin: 20px 0 0;">This code will expire in 10 minutes. If you did not request this login, please contact the administrator.</p>
          </div>
        </div>
      `
    });

    res.json({
      step: 'OTP_REQUIRED',
      email
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Resend OTP Route
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await Admin.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    await user.save();

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'The Glitch Cafe <orders@eazsocial.online>',
      to: email,
      subject: 'Your Login Verification Code - The Glitch Cafe',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f6f6; padding: 32px 16px; text-align: center;">
          <div style="max-width: 440px; margin: 0 auto; background: #ffffff; padding: 36px 28px; border-radius: 14px; border: 1px solid #eaeaea; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
            <h2 style="margin: 0 0 6px; color: #111; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">THE GLITCH CAFE</h2>
            <p style="color: #666; font-size: 13px; margin: 0 0 24px;">Admin Portal Authentication</p>
            <p style="color: #333; font-size: 14px; margin: 0 0 12px;">Use this 6-digit code to complete your login:</p>
            <div style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #000; padding: 16px; background: #f3f4f6; border-radius: 10px; margin: 16px 0;">
              ${otp}
            </div>
            <p style="color: #888; font-size: 12px; margin: 20px 0 0;">This code will expire in 10 minutes. If you did not request this login, please contact the administrator.</p>
          </div>
        </div>
      `
    });

    res.json({ success: true, message: 'A fresh OTP has been sent to your email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify OTP Route
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = await Admin.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid or expired OTP code' });

    if (user.otp !== otp || new Date() > new Date(user.otpExpires)) {
      return res.status(400).json({ error: 'Invalid or expired OTP code' });
    }

    // Clear OTP
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const payload = {
      id: user._id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      permissions: user.permissions
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '12h' });

    res.json({
      token,
      user: payload
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Staff Management Routes
router.post('/staff', [authMiddleware, superAdminMiddleware], async (req, res) => {
  try {
    const { email, password, permissions } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new Admin({
      email,
      password: hashedPassword,
      isSuperAdmin: false,
      permissions: permissions || []
    });

    await newUser.save();
    
    res.status(201).json({ message: 'Staff created successfully', user: { email: newUser.email, permissions: newUser.permissions } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/staff', [authMiddleware, superAdminMiddleware], async (req, res) => {
  try {
    const staff = await Admin.find({ isSuperAdmin: false }).select('-password');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/staff/:id', [authMiddleware, superAdminMiddleware], async (req, res) => {
  try {
    const { email, password, permissions } = req.body;
    
    const user = await Admin.findOne({ _id: req.params.id, isSuperAdmin: false });
    if (!user) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    if (email) {
      const existingEmail = await Admin.findOne({ email, _id: { $ne: req.params.id } });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      user.email = email;
    }

    if (permissions) {
      user.permissions = permissions;
    }

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    
    res.json({ message: 'Staff updated successfully', user: { email: user.email, permissions: user.permissions } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
