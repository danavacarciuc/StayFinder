const express = require("express");
const router = express.Router();
const db = require("../config/db");
console.log("DB în cities:", db.filename);

router.get("/", (req, res) => {
  db.all("SELECT * FROM cities LIMIT 9", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;


router.get("/", (req, res) => {
  console.log("DB FILE:", require('path').resolve('./database.sqlite'));
  db.all("SELECT * FROM cities LIMIT 9", [], (err, rows) => {
    console.log("CITIES:", err, rows);
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});