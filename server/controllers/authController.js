const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../config/db");

exports.login = (req, res) => {
  const { email, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(400).json({ message: "User not found" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Invalid credentials" });

     const token = jwt.sign(
        { id: user.id, name: user.name, is_host: user.is_host || 0, is_admin: user.is_admin || 0 },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
        );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    }
  );
};

exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
    [name, email, hashed],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      const token = jwt.sign(
        { id: this.lastID, name },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token });
    }
  );
};