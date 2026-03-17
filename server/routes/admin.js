const express = require("express");
const router = express.Router();
const db = require("../config/db");
const verifyToken = require("../middleware/verifyToken");

const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const upload = multer({ storage: multer.memoryStorage() });

function requireAdmin(req, res, next) {
  if (!req.user.is_admin) return res.status(403).json({ error: "Admins only" });
  next();
}

// Get all users
router.get("/users", verifyToken, requireAdmin, (req, res) => {
  db.all("SELECT id, name, email, is_host, is_admin, avatar, location, created_at FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Delete user
router.delete("/users/:id", verifyToken, requireAdmin, (req, res) => {
  db.run("DELETE FROM users WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Get properties cu paginare + search
router.get("/properties", verifyToken, requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const search = req.query.search || "";
  const offset = (page - 1) * limit;

  const searchParam = `%${search}%`;

  db.get(`
    SELECT COUNT(*) as total FROM properties p
    WHERE p.title LIKE ? OR p.city LIKE ?
  `, [searchParam, searchParam], (err, countRow) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all(`
      SELECT p.id, p.title, p.city, p.price, p.facilities,
        u.name as host_name, u.email as host_email,
        (SELECT image_path FROM property_images WHERE property_id = p.id LIMIT 1) as image
      FROM properties p
      LEFT JOIN users u ON u.id = p.host_id
      WHERE p.title LIKE ? OR p.city LIKE ?
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `, [searchParam, searchParam, limit, offset], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        properties: rows,
        total: countRow.total,
        page,
        totalPages: Math.ceil(countRow.total / limit)
      });
    });
  });
});

// Update property
router.put("/properties/:id", verifyToken, requireAdmin, (req, res) => {
  const { title, address, city, price, description, facilities } = req.body;
  db.run(
    "UPDATE properties SET title=?, address=?, city=?, price=?, description=?, facilities=? WHERE id=?",
    [title, address, city, price, description, facilities || "", req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Delete property
router.delete("/properties/:id", verifyToken, requireAdmin, (req, res) => {
  db.run("DELETE FROM properties WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Get property images
router.get("/properties/:id/images", verifyToken, requireAdmin, (req, res) => {
  db.all("SELECT * FROM property_images WHERE property_id = ?", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Upload new images
router.post("/properties/:id/images", verifyToken, requireAdmin, upload.array("images", 10), async (req, res) => {
  const propertyId = req.params.id;
  try {
    await new Promise((resolve, reject) => {
      db.run("DELETE FROM property_images WHERE property_id = ?", [propertyId], (err) => {
        if (err) reject(err); else resolve();
      });
    });

    for (const file of req.files) {
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "stayfinder" },
          (error, result) => { if (error) reject(error); else resolve(result); }
        );
        stream.end(file.buffer);
      });

      await new Promise((resolve, reject) => {
        db.run("INSERT INTO property_images (property_id, image_path) VALUES (?, ?)",
          [propertyId, result.secure_url],
          (err) => { if (err) reject(err); else resolve(); }
        );
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get reservations cu paginare
router.get("/reservations", verifyToken, requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  db.get(`SELECT COUNT(*) as total FROM reservations`, [], (err, countRow) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all(`
      SELECT r.*, u.name as guest_name, u.email as guest_email,
      p.title as property_title, p.city
      FROM reservations r
      LEFT JOIN users u ON u.id = r.guest_id
      LEFT JOIN properties p ON p.id = r.property_id
      ORDER BY r.id DESC
      LIMIT ? OFFSET ?
    `, [limit, offset], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        reservations: rows,
        total: countRow.total,
        page,
        totalPages: Math.ceil(countRow.total / limit)
      });
    });
  });
});

// Delete reservation
router.delete("/reservations/:id", verifyToken, requireAdmin, (req, res) => {
  db.run("DELETE FROM reservations WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Get reviews cu paginare
router.get("/reviews", verifyToken, requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  db.get(`SELECT COUNT(*) as total FROM reviews`, [], (err, countRow) => {
    if (err) return res.status(500).json({ error: err.message });

    db.all(`
      SELECT r.*, u.name as guest_name, p.title as property_title
      FROM reviews r
      LEFT JOIN users u ON u.id = r.guest_id
      LEFT JOIN properties p ON p.id = r.property_id
      ORDER BY r.id DESC
      LIMIT ? OFFSET ?
    `, [limit, offset], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        reviews: rows,
        total: countRow.total,
        page,
        totalPages: Math.ceil(countRow.total / limit)
      });
    });
  });
});

// Delete review
router.delete("/reviews/:id", verifyToken, requireAdmin, (req, res) => {
  db.run("DELETE FROM reviews WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Stats pentru cards
router.get("/stats", verifyToken, requireAdmin, (req, res) => {
  const stats = {};
  db.get("SELECT COUNT(*) as c FROM users", (e, r) => { stats.users = r.c;
  db.get("SELECT COUNT(*) as c FROM properties", (e, r) => { stats.properties = r.c;
  db.get("SELECT COUNT(*) as c FROM reservations", (e, r) => { stats.reservations = r.c;
  db.get("SELECT COUNT(*) as c FROM reviews", (e, r) => { stats.reviews = r.c;
    res.json(stats);
  }); }); }); });
});

module.exports = router;