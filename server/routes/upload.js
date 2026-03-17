const express = require("express");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const db = require("../config/db");
const verifyToken = require("../middleware/verifyToken");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/property", upload.array("images", 5), (req, res) => {

  const { title, price, city_id } = req.body;

  db.run(
    `INSERT INTO properties (title, price, city_id)
     VALUES (?, ?, ?)`,
    [title, price, city_id],
    async function (err) {

      if (err) return res.status(500).json(err);

      const propertyId = this.lastID;

      try {

        for (const file of req.files) {

          const result = await new Promise((resolve, reject) => {

            const stream = cloudinary.uploader.upload_stream(
              { folder: "stayfinder" },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );

            stream.end(file.buffer);

          });

          db.run(
            `INSERT INTO property_images (property_id, image_url)
             VALUES (?, ?)`,
            [propertyId, result.secure_url]
          );

        }

        res.json({ success: true });

      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Upload failed" });
      }

    }
  );

});


const path = require("path");
const fs = require("fs");

router.post("/avatar", verifyToken, upload.single("avatar"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "stayfinder/avatars" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    db.run(
      `UPDATE users SET avatar = ? WHERE id = ?`,
      [result.secure_url, req.user.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ avatar_url: result.secure_url });
      }
    );

  } catch (err) {
    console.log("CLOUDINARY ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;