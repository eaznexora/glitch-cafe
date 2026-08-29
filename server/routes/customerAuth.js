const express = require('express');
const router = express.Router();
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const Otp = require('../models/Otp');
const Customer = require('../models/Customer');

// Request OTP Route
router.post('/request-otp', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Upsert OTP in case they request multiple times quickly
    await Otp.findOneAndUpdate(
      { email },
      { email, otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'The Glitch Cafe <orders@eaznexora.com>',
      to: email,
      subject: 'Welcome to The Glitch Cafe',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f7f7; padding: 24px; text-align: center;">
          <div style="max-width: 420px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 14px; border: 1px solid #eee;">
            <h2 style="margin: 0 0 6px; color: #111; font-weight: 800; letter-spacing: 0.5px;">THE GLITCH CAFE</h2>
            <p style="color: #666; font-size: 14px; margin: 0 0 20px;">Welcome ${name}! Use this code to verify your table session:</p>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #000; background: #f3f4f6; padding: 14px; border-radius: 8px; margin-bottom: 20px;">
              ${otp}
            </div>
            <p style="color: #999; font-size: 12px; margin: 0;">Expires in 5 minutes.</p>
          </div>
        </div>
      `
    });

    res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    console.error('Request OTP Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verify OTP Route
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp, name } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const otpRecord = await Otp.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Valid OTP, upsert customer
    const customer = await Customer.findOneAndUpdate(
      { email },
      { 
        $set: { name, lastVisit: new Date() },
        $inc: { totalVisits: 1 } 
      },
      { upsert: true, new: true }
    );

    // Clean up OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    res.json({ success: true, customer: { name: customer.name, email: customer.email } });
  } catch (err) {
    console.error('Verify OTP Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
