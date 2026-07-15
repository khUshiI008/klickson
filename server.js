// server.js
// Small backend that receives the "Executive Assistant" application form
// (including the resume file) and emails it to the hiring inbox.
//
// Run locally:   npm install   then   node server.js
// Deploy on any Node host (Render, Railway, a VPS, etc). Do NOT deploy
// this as-is to a static host (Netlify/GitHub Pages) — those don't run
// Node servers. Use their "Functions" feature instead, or a small VPS.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Allow requests from your careers page. Replace '*' with your real domain
// in production, e.g. 'https://klicksonpaints.com'
app.use(cors({ origin: '*' }));
app.use(express.json());

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Google Workspace uses the same SMTP as Gmail
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER, // ea@klicksonpaints.com
    pass: process.env.SMTP_APP_PASSWORD, // the 16-character app password
  },
});

app.post('/api/apply', upload.single('resume'), async (req, res) => {
  try {
    const { fullName, email, phone, comfortable } = req.body;

    if (!fullName || !email || !phone || !comfortable || !req.file) {
      return res.status(400).json({ ok: false, error: 'Missing required fields.' });
    }

    const mailOptions = {
      from: `"Klickson Careers Page" <${process.env.SMTP_USER}>`,
      to: process.env.MAIL_TO, // klicksonpaints@gmail.com
      replyTo: email,
      subject: `Application: Executive Assistant — ${fullName}`,
      text:
        `Full name: ${fullName}\n` +
        `Email: ${email}\n` +
        `Phone: ${phone}\n` +
        `Comfortable working at Patiala facility: ${comfortable}\n`,
      attachments: [
        {
          filename: req.file.originalname,
          content: req.file.buffer,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to send application email:', err);
    res.status(500).json({ ok: false, error: 'Failed to send email.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Application server running on port ${PORT}`));