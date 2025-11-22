// Backend API for sending emails via SMTP
// Run this with: node backend/email-api.js
// Or deploy to a server (Heroku, Vercel, etc.)

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // In production, specify your app's origin
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// SMTP Configuration from environment variables or defaults
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.MAIL_USERNAME || 'wasieacuna@gmail.com',
    pass: process.env.MAIL_PASSWORD || 'agozivjqavbvtgti',
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const MAIL_FROM_ADDRESS = process.env.MAIL_FROM_ADDRESS || 'fromadmin@gmail.com';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'Peregrine Admin';

// Verify SMTP connection
transporter.verify(function (error, success) {
  if (error) {
    console.log('SMTP Error:', error);
  } else {
    console.log('SMTP Server is ready to send emails');
  }
});

// Email sending endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || !text) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const mailOptions = {
      from: {
        name: MAIL_FROM_NAME,
        address: MAIL_FROM_ADDRESS,
      },
      to: to,
      subject: subject,
      text: text,
      html: html || text,
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent:', info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Email API server running on port ${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/send-email`);
});

