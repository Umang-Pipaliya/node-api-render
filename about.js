const express = require('express');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Set up multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

// Get all team members
router.get('/team', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM team ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
});

// Add a new team member (admin only, with photo upload)
router.post('/team', authenticateToken, upload.single('photo'), async (req, res) => {
  const { name, role, bio } = req.body;
  const photo = req.file ? req.file.filename : null;
  if (!name || !role) return res.status(400).json({ message: 'Name and role required' });
  try {
    const result = await db.query(
      'INSERT INTO team (name, role, photo, bio) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, role, photo, bio]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
});

// Update a team member (admin only)
router.put('/team/:id', authenticateToken, upload.single('photo'), async (req, res) => {
  const { name, role, bio } = req.body;
  const photo = req.file ? req.file.filename : null;
  const id = req.params.id;
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    if (name) { fields.push(`name = $${idx++}`); values.push(name); }
    if (role) { fields.push(`role = $${idx++}`); values.push(role); }
    if (bio) { fields.push(`bio = $${idx++}`); values.push(bio); }
    if (photo) { fields.push(`photo = $${idx++}`); values.push(photo); }
    if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });
    values.push(id);
    const result = await db.query(
      `UPDATE team SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
});

// Delete a team member (admin only)
router.delete('/team/:id', authenticateToken, async (req, res) => {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM team WHERE id = $1', [id]);
    res.json({ message: 'Team member deleted' });
  } catch (err) {
    res.status(500).json({ message: 'DB error' });
  }
});

module.exports = router;
