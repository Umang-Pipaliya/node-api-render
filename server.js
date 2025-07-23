const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const db = require('./db');
const helmet = require('helmet');
const logger = require('./logger');

require('dotenv').config({ path: './test.env' });

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

const { router: authRouter } = require('./auth');
const contactRouter = require('./contact');
const galleryRouter = require('./gallery');
const aboutRouter = require('./about');

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRouter);
app.use('/api/contact', contactRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/about', aboutRouter);

app.get('/', (req, res) => {
  res.send('Vikrmdeep Impex API running');
});

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

async function ensureAdmin() {
  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASS;

  if (!username || !password) {
    logger.warn('ADMIN_USER or ADMIN_PASS not set in .env');
    return;
  }

  try {
    const result = await db.query('SELECT * FROM admin WHERE username = $1', [username]);
    if (result.rowCount === 0) {
      const hash = await bcrypt.hash(password, 10);
      await db.query('INSERT INTO admin (username, password) VALUES ($1, $2)', [username, hash]);
      logger.info('✅ Default admin created');
    } else {
      logger.info('✅ Admin already exists');
    }
  } catch (err) {
    logger.error('❌ Error ensuring admin:', err);
  }
}

app.listen(PORT, async () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  await ensureAdmin();
});

module.exports = app;
