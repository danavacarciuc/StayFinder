router.post("/login", (req, res) => {

  const { email, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, user) => {

      if (!user) return res.status(400).json({ error: "User not found" });

      const match = await bcrypt.compare(password, user.password);

      if (!match) return res.status(400).json({ error: "Wrong password" });

      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET
      );

      res.json({ token });
    }
  );
});