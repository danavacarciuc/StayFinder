const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

// CREATE RESERVATION
router.post("/", verifyToken, (req, res) => {
  const { property_id, check_in, check_out, payment_status } = req.body;
  const guest_id = req.user.id;

  if (!property_id || !check_in || !check_out) {
    return res.status(400).json({ error: "Missing fields" });
  }

  db.get(
    `SELECT id FROM reservations 
     WHERE property_id = ? 
     AND status != 'cancelled'
     AND check_in < ? AND check_out > ?`,
    [property_id, check_out, check_in],
    (err, existing) => {
      if (err) return res.status(500).json({ error: err.message });
      if (existing) return res.status(400).json({ error: "Property not available for these dates" });

      db.get("SELECT price FROM properties WHERE id = ?", [property_id], (err, property) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!property) return res.status(404).json({ error: "Property not found" });

        const nights = Math.round((new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24));
        const total_price = nights * property.price;
        const pStatus = payment_status || "pending";

        db.run(
          `INSERT INTO reservations (property_id, guest_id, check_in, check_out, total_price, status, payment_status)
           VALUES (?, ?, ?, ?, ?, 'confirmed', ?)`,
          [property_id, guest_id, check_in, check_out, total_price, pStatus],
          function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, reservation_id: this.lastID, total_price });
          }
        );
      });
    }
  );
});

// GUEST - MY RESERVATIONS
router.get("/my", verifyToken, (req, res) => {
  db.all(
    `SELECT r.*, p.title as property_title, p.city, p.address,
      pi.image_path as image
     FROM reservations r
     JOIN properties p ON p.id = r.property_id
     LEFT JOIN property_images pi ON pi.property_id = p.id
       AND pi.id = (SELECT MIN(id) FROM property_images WHERE property_id = p.id)
     WHERE r.guest_id = ?
     ORDER BY r.created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// HOST - REZERVARILE PE PROPRIETATILE MELE
router.get("/host", verifyToken, (req, res) => {
  db.all(
    `SELECT r.*, p.title as property_title, u.name as guest_name, u.email as guest_email,
      pi.image_path as image
     FROM reservations r
     JOIN properties p ON p.id = r.property_id
     JOIN users u ON u.id = r.guest_id
     LEFT JOIN property_images pi ON pi.property_id = p.id
       AND pi.id = (SELECT MIN(id) FROM property_images WHERE property_id = p.id)
     WHERE p.host_id = ?
     ORDER BY r.created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ANULEAZĂ REZERVARE + CALCULEAZĂ REFUND
router.put("/:id/cancel", verifyToken, (req, res) => {
  // Găsim rezervarea
  db.get(
    `SELECT * FROM reservations WHERE id = ? AND guest_id = ?`,
    [req.params.id, req.user.id],
    (err, reservation) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!reservation) return res.status(404).json({ error: "Reservation not found" });
      if (reservation.status === "cancelled") return res.status(400).json({ error: "Already cancelled" });

      // Calculează refund în funcție de cât timp a mai rămas până la check-in
      const now = new Date();
      const checkIn = new Date(reservation.check_in + "T00:00:00");
      const daysUntilCheckIn = Math.ceil((checkIn - now) / (1000 * 60 * 60 * 24));

      let refundAmount = 0;
      let refundPolicy = "";

      if (reservation.payment_status !== "paid") {
        // Nu s-a plătit, nu există refund
        refundAmount = 0;
        refundPolicy = "no_payment";
      } else if (daysUntilCheckIn >= 5) {
        // Refund complet
        refundAmount = reservation.total_price;
        refundPolicy = "full";
      } else if (daysUntilCheckIn >= 2) {
        // Refund 50%
        refundAmount = Math.round(reservation.total_price * 0.5);
        refundPolicy = "partial";
      } else {
        // No refund
        refundAmount = 0;
        refundPolicy = "none";
      }

      db.run(
        `UPDATE reservations SET status = 'cancelled', refund_amount = ? WHERE id = ?`,
        [refundAmount, req.params.id],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({
            success: true,
            refund_amount: refundAmount,
            refund_policy: refundPolicy,
            days_until_checkin: daysUntilCheckIn
          });
        }
      );
    }
  );
});

// HISTORY PENTRU PROFIL
router.get("/history", verifyToken, (req, res) => {
  db.all(
    `SELECT r.*, p.title as property_title, p.city, p.address
     FROM reservations r
     JOIN properties p ON p.id = r.property_id
     WHERE r.guest_id = ? AND r.status = 'confirmed'
     ORDER BY r.check_out DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;