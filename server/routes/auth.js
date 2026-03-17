const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");


router.post('/login', login);
router.post("/forgot-password", (req, res) => {
  const { email } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (!user) return res.json({ message: "If email exists, reset sent." });

    const token = require("crypto").randomBytes(32).toString("hex");
    const expires = Date.now() + 3600000; // 1h

    db.run(
      `UPDATE users SET reset_token = ?, reset_expires = ?
       WHERE id = ?`,
      [token, expires, user.id]
    );

    console.log("RESET LINK:");
    console.log(`http://localhost:5000/reset.html?token=${token}`);

    res.json({ message: "If email exists, reset sent." });
  });
});

router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/login.html" }),
  (req, res) => {
    res.redirect("/dashboard.html");
  }
);

router.post("/register", async (req, res) => {

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {

    if (user) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (name, email, password)
       VALUES (?, ?, ?)`,
      [name, email, hash],
      function (err) {
        if (err) return res.status(500).json({ message: "Database error" });

        res.json({ message: "User created" });
      }
    );

  });

});

router.post("/register", async (req, res) => {

  const { name, email, password} = req.body;
  const hashed = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO users (name, email, password, is_host)
     VALUES (?, ?, ?, 0)`,
    [name, email, hashedPassword],
    function(err) {

      if (err) return res.status(500).json({ error: "Account with this email already exists" });

      const token = jwt.sign(
        { id: user.id, is_host: user.is_host, is_admin: user.is_admin || 0 },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
        );

      res.json({ token });
    }
  );
});

router.post("/login", (req, res) => {

  const { email, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, user) => {

      if (!user) return res.status(400).json({ error: "User not found" });

      const match = await bcrypt.compare(password, user.password);

      if (!match)
        return res.status(400).json({ error: "Wrong password" });

     const token = jwt.sign(
        { id: user.id, is_host: user.is_host, is_admin: user.is_admin || 0 },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
        );

      res.json({ token });
    }
  );
});

const verifyToken = require("../middleware/verifyToken");

router.post("/become-host", verifyToken, (req, res) => {

  db.run(
    "UPDATE users SET is_host = 1 WHERE id = ?",
    [req.user.id],
    function(err) {

      if (err) return res.status(500).json({ error: err.message });

      const newToken = jwt.sign(
        {
          id: req.user.id,
          is_host: 1
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token: newToken });
    }
  );
});

module.exports = router;
