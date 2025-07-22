const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const { authenticateToken } = require('./auth');
const xss = require('xss');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.mimetype))
      return cb(new Error('Only JPEG and PNG images are allowed'));
    cb(null, true);
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM gallery ORDER BY uploaded_at DESC');
    const rows = result.rows.map(row => ({
      id: row.id,
      url: `/uploads/${row.filename}`,
      alt_text: row.alt_text,
      uploaded_at: row.uploaded_at
    }));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const ext = req.file.originalname.split('.').pop().toLowerCase();
  if (!['jpg', 'jpeg', 'png'].includes(ext))
    return res.status(400).json({ message: 'Invalid file extension' });

  const alt_text = xss(req.body.alt_text || '');

  try {
    const result = await db.query(
      'INSERT INTO gallery (filename, alt_text) VALUES ($1, $2) RETURNING id',
      [req.file.filename, alt_text]
    );
    res.json({ id: result.rows[0].id, url: `/uploads/${req.file.filename}`, alt_text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await db.query('SELECT filename FROM gallery WHERE id = $1', [id]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ message: 'Image not found' });

    const filePath = path.join(__dirname, 'uploads', row.filename);
    fs.unlink(filePath, () => {});

    await db.query('DELETE FROM gallery WHERE id = $1', [id]);
    res.json({ message: 'Image deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'DB error' });
  }
});

module.exports = router;
