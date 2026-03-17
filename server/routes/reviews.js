const express = require("express");
const router = express.Router();
const db = require("../config/db");
const verifyToken = require("../middleware/verifyToken");

// Reviews ale userului logat
router.get("/me", verifyToken, (req, res) => {
  db.all(
    `SELECT r.rating, r.comment, r.created_at, r.property_id, p.title as property_title
     FROM reviews r
     LEFT JOIN properties p ON r.property_id = p.id
     WHERE r.guest_id = ?
     ORDER BY r.created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Reviews pentru o proprietate
router.get("/property/:id", (req, res) => {
  db.all(
    `SELECT r.id, r.rating, r.comment, r.created_at, u.name as guest_name, u.avatar as guest_avatar
     FROM reviews r
     JOIN users u ON r.guest_id = u.id
     WHERE r.property_id = ?
     ORDER BY r.created_at DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Adaugă review (doar dacă userul a avut o rezervare completată)
router.post("/", verifyToken, (req, res) => {
  const { property_id, rating, comment } = req.body;

  if (!property_id || !rating || !comment) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5." });
  }

  // Verifică dacă userul a avut o rezervare completată la această proprietate
  db.get(
    `SELECT id FROM reservations
     WHERE property_id = ? AND user_id = ? AND status = 'confirmed' AND check_out < date('now')`,
    [property_id, req.user.id],
    (err, reservation) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!reservation) {
        return res.status(403).json({ error: "You can only review properties you have stayed at." });
      }

      // Verifică dacă a mai lăsat deja review
      db.get(
        `SELECT id FROM reviews WHERE property_id = ? AND guest_id = ?`,
        [property_id, req.user.id],
        (err, existing) => {
          if (err) return res.status(500).json({ error: err.message });
          if (existing) {
            return res.status(409).json({ error: "You have already reviewed this property." });
          }

          db.run(
            `INSERT INTO reviews (property_id, guest_id, rating, comment, created_at)
             VALUES (?, ?, ?, ?, datetime('now'))`,
            [property_id, req.user.id, rating, comment],
            function (err) {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ success: true, id: this.lastID });
            }
          );
        }
      );
    }
  );
});

module.exports = router;