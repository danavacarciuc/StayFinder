const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

// Obține toate conversațiile userului curent
router.get("/", verifyToken, (req, res) => {
  const userId = req.user.id;
  db.all(`
    SELECT c.*,
      p.title as property_title,
      p.city as property_city,
      (SELECT image_path FROM property_images WHERE property_id = c.property_id LIMIT 1) as property_image,
      guest.id as guest_id, guest.name as guest_name, guest.avatar as guest_avatar,
      host.id as host_id, host.name as host_name, host.avatar as host_avatar,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != ? AND read = 0) as unread_count
    FROM conversations c
    JOIN users guest ON guest.id = c.guest_id
    JOIN users host ON host.id = c.host_id
    LEFT JOIN properties p ON p.id = c.property_id
    WHERE c.guest_id = ? OR c.host_id = ?
    ORDER BY last_message_at DESC
  `, [userId, userId, userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Obține sau creează o conversație între user și host pentru o proprietate
router.post("/conversation", verifyToken, (req, res) => {
  const { host_id, property_id } = req.body;
  const guest_id = req.user.id;

  if (guest_id === parseInt(host_id)) {
    return res.status(400).json({ error: "Cannot message yourself" });
  }

  // Verifică dacă există deja o conversație
  db.get(`
    SELECT * FROM conversations
    WHERE guest_id = ? AND host_id = ? AND property_id = ?
  `, [guest_id, host_id, property_id || null], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });

    if (existing) return res.json({ conversation_id: existing.id });

    db.run(`
      INSERT INTO conversations (guest_id, host_id, property_id)
      VALUES (?, ?, ?)
    `, [guest_id, host_id, property_id || null], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ conversation_id: this.lastID });
    });
  });
});

// Obține mesajele dintr-o conversație
router.get("/:conversationId/messages", verifyToken, (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;

  // Verifică că userul face parte din conversație
  db.get(`SELECT * FROM conversations WHERE id = ? AND (guest_id = ? OR host_id = ?)`,
    [conversationId, userId, userId], (err, conv) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!conv) return res.status(403).json({ error: "Access denied" });

      // Marchează mesajele ca citite
      db.run(`UPDATE messages SET read = 1 WHERE conversation_id = ? AND sender_id != ?`,
        [conversationId, userId]);

      db.all(`
        SELECT m.*, u.name as sender_name, u.avatar as sender_avatar
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = ?
        ORDER BY m.created_at ASC
      `, [conversationId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
      });
    });
});

// Trimite un mesaj
router.post("/:conversationId/messages", verifyToken, (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  db.get(`SELECT * FROM conversations WHERE id = ? AND (guest_id = ? OR host_id = ?)`,
    [conversationId, userId, userId], (err, conv) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!conv) return res.status(403).json({ error: "Access denied" });

      db.run(`INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)`,
        [conversationId, userId, content.trim()], function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ success: true, message_id: this.lastID });
        });
    });
});

// Număr total mesaje necitite (pentru badge în navbar)
router.get("/unread/count", verifyToken, (req, res) => {
  const userId = req.user.id;
  db.get(`
    SELECT COUNT(*) as count
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE (c.guest_id = ? OR c.host_id = ?)
    AND m.sender_id != ?
    AND m.read = 0
  `, [userId, userId, userId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ count: row.count });
  });
});

module.exports = router;