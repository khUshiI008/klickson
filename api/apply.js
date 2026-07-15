// api/apply.js
// Vercel Serverless Function. Deployed at: https://YOUR-PROJECT.vercel.app/api/apply
//
// Vercel functions don't parse multipart/form-data automatically, so we
// disable the default body parser (see `config` export below) and handle
// the multipart body ourselves with multer.

const multer = require('multer');
const nodemailer = require('nodemailer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => (result instanceof Error ? reject(result) : resolve(result)));
  });
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_APP_PASSWORD,
  },
});

module.exports = async (req, res) => {
  // CORS — safe to leave '*' since the page and API share the same domain
  // once deployed together, but this keeps local testing flexible too.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    await runMiddleware(req, res, upload.single('resume'));

    const { fullName, email, phone, comfortable } = req.body;

    if (!fullName || !email || !phone || !comfortable || !req.file) {
      return res.status(400).json({ ok: false, error: 'Missing required fields.' });
    }

    const info = await transporter.sendMail({
      from: `"Klickson Careers Page" <${process.env.SMTP_USER}>`,
      to: process.env.MAIL_TO,
      replyTo: email,
      subject: `Application: Executive Assistant — ${fullName}`,
      text:
        `Full name: ${fullName}\n` +
        `Email: ${email}\n` +
        `Phone: ${phone}\n` +
        `Comfortable working at Patiala facility: ${comfortable}\n`,
      attachments: [{ filename: req.file.originalname, content: req.file.buffer }],
    });

    console.log('Email accepted by SMTP server:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Failed to send application email:', err);
    return res.status(500).json({ ok: false, error: 'Failed to send email.' });
  }
};

module.exports.config = {
  api: {
    bodyParser: false, // required so multer can read the raw multipart stream
  },
};