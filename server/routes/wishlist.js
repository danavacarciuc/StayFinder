const express = require("express");
const router = express.Router();
const db = require("../config/db");
const verifyToken = require("../middleware/verifyToken");

router.get("/", verifyToken, (req, res) => {
  db.all(
    `SELECT p.id, p.title, p.address, p.price,
            (SELECT image_path FROM property_images WHERE property_id = p.id LIMIT 1) as image,
            ROUND(AVG(r.rating), 1) as rating,
            COUNT(r.id) as reviews_count
     FROM favorites w
     JOIN properties p ON w.property_id = p.id
     LEFT JOIN reviews r ON r.property_id = p.id
     WHERE w.user_id = ?
     GROUP BY p.id`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post("/", verifyToken, (req, res) => {
  const { property_id } = req.body;
  db.run(
    "INSERT OR IGNORE INTO favorites (user_id, property_id) VALUES (?, ?)",
    [req.user.id, property_id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

router.delete("/:property_id", verifyToken, (req, res) => {
  db.run(
    "DELETE FROM favorites WHERE user_id = ? AND property_id = ?",
    [req.user.id, req.params.property_id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

module.exports = router;