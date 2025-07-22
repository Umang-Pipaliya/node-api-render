const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const db = require('./db');

require('dotenv').config({ path: './test.env' });

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';

const { router: authRouter } = require('./auth');
const contactRouter = require('./contact');
const galleryRouter = require('./gallery');

app.use(cors({ origin: FRONTEND_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRouter);
app.use('/api/contact', contactRouter);
app.use('/api/gallery', galleryRouter);

app.get('/', (req, res) => {
  res.send('Vikrmdeep Impex API running');
});

async function ensureAdmin() {
  const username = process.env.ADMIN_USER;
  const password = process.env.ADMIN_PASS;

  if (!username || !password) {
    console.warn('ADMIN_USER or ADMIN_PASS not set in .env');
    return;
  }

  try {
    const result = await db.query('SELECT * FROM admin WHERE username = $1', [username]);
    if (result.rowCount === 0) {
      const hash = await bcrypt.hash(password, 10);
      await db.query('INSERT INTO admin (username, password) VALUES ($1, $2)', [username, hash]);
      console.log('✅ Default admin created');
    } else {
      console.log('✅ Admin already exists');
    }
  } catch (err) {
    console.error('❌ Error ensuring admin:', err);
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await ensureAdmin();
});
