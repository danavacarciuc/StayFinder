const express = require("express");
const router = express.Router();
const db = require("../config/db");
const verifyToken = require("../middleware/verifyToken");
const bcrypt = require("bcrypt");

router.get("/me", verifyToken, (req, res) => {
  db.get(
    `SELECT id, name, email, avatar, location, description, is_admin FROM users WHERE id = ?`,
    [req.user.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "User not found" });
      res.json(row);
    }
  );
});

router.put("/me", verifyToken, (req, res) => {
  const { description, location } = req.body;
  db.run(
    `UPDATE users SET description = ?, location = ? WHERE id = ?`,
    [description, location, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Schimbare email
router.put("/me/email", verifyToken, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Incorrect password" });

    // Verifică dacă emailul e deja folosit
    db.get(`SELECT id FROM users WHERE email = ? AND id != ?`, [email, req.user.id], (err, existing) => {
      if (existing) return res.status(400).json({ error: "Email already in use" });

      db.run(`UPDATE users SET email = ? WHERE id = ?`, [email, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    });
  });
});

// Schimbare parolă
router.put("/me/password", verifyToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "All fields required" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 10);
    db.run(`UPDATE users SET password = ? WHERE id = ?`, [hash, req.user.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// Ștergere cont
router.delete("/me", verifyToken, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password required" });

  db.get(`SELECT * FROM users WHERE id = ?`, [req.user.id], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Incorrect password" });

    db.run(`DELETE FROM users WHERE id = ?`, [req.user.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

module.exports = router;