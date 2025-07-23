const express = require('express');
const db = require('./db');
const rateLimit = require('express-rate-limit');
const xss = require('xss');
const logger = require('./logger');

const router = express.Router();

function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return {
    question: `What is ${a} + ${b}?`,
    answer: a + b
  };
}

const captchaStore = {};

router.get('/captcha', (req, res) => {
  const captcha = generateCaptcha();
  const id = Date.now() + Math.random().toString(36).substr(2, 5);
  captchaStore[id] = captcha.answer;
  setTimeout(() => { delete captchaStore[id]; }, 5 * 60 * 1000);
  res.json({ captchaId: id, question: captcha.question });
});

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: { message: 'Too many contact requests, please try again later.' }
});

router.post('/', contactLimiter, async (req, res) => {
  let { name, email, message, captchaId, captchaAnswer } = req.body;
  name = xss(name || '');
  email = xss(email || '');
  message = xss(message || '');

  if (!name || !email || !message || !captchaId || captchaAnswer === undefined)
    return res.status(400).json({ message: 'All fields are required' });

  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailRegex.test(email))
    return res.status(400).json({ message: 'Invalid email' });

  const expected = captchaStore[captchaId];
  if (!expected || parseInt(captchaAnswer) !== expected)
    return res.status(400).json({ message: 'Invalid or expired captcha' });

  delete captchaStore[captchaId];

  try {
    await db.query('INSERT INTO contact (name, email, message) VALUES ($1, $2, $3)', [name, email, message]);
    res.json({ message: 'Submitted successfully' });
  } catch (err) {
    logger.error(err);
    res.status(500).json({ message: 'DB error' });
  }
});

module.exports = router;
