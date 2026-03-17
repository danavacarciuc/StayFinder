const express = require("express");
const router = express.Router();
const db = require("../config/db");
const {verifyToken, requireRole} = require("../middleware/auth");

const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const cloudinary = require("../config/cloudinary");

// Normalizează diacritice complet
function stripDiacritics(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const cityAliases = {
  "bucuresti": "Bucharest", "bucharest": "Bucharest", "bucarest": "Bucharest",
  "brasov": "Brasov", "brașov": "Brasov", "kronstadt": "Brasov",
  "cluj": "Cluj-Napoca", "cluj napoca": "Cluj-Napoca", "cluj-napoca": "Cluj-Napoca",
  "kolozsvar": "Cluj-Napoca", "klausenburg": "Cluj-Napoca",
  "constanta": "Constanta", "constanța": "Constanta",
  "sinaia": "Sinaia",
  "chisinau": "Chisinau", "chișinău": "Chisinau", "kishinev": "Chisinau",
  "paris": "Paris", "barcelona": "Barcelona",
  "rome": "Rome", "roma": "Rome",
  "london": "London", "londra": "London",
  "amsterdam": "Amsterdam",
  "prague": "Prague", "praga": "Prague", "praha": "Prague",
  "vienna": "Vienna", "viena": "Vienna", "wien": "Vienna",
  "milan": "Milan", "milano": "Milan",
  "berlin": "Berlin",
  "budapest": "Budapest", "budapesta": "Budapest",
  "new york": "New York", "newyork": "New York",
  "los angeles": "Los Angeles",
  "tokyo": "Tokyo", "bangkok": "Bangkok", "singapore": "Singapore",
  "bali": "Bali", "dubai": "Dubai", "istanbul": "Istanbul",
  "seoul": "Seoul", "mumbai": "Mumbai",
  "cape town": "Cape Town", "capetown": "Cape Town",
  "marrakech": "Marrakech", "nairobi": "Nairobi",
  "sydney": "Sydney", "melbourne": "Melbourne", "auckland": "Auckland",
  "rio de janeiro": "Rio de Janeiro", "buenos aires": "Buenos Aires",
  "bogota": "Bogota", "toronto": "Toronto",
  "mexico city": "Mexico City", "chicago": "Chicago", "miami": "Miami",
};

function resolveCity(rawCity) {
  if (!rawCity) return null;
  const normalized = stripDiacritics(rawCity);
  // Caută în aliasuri
  if (cityAliases[normalized]) return cityAliases[normalized];
  // Returnează raw dar cu prima literă mare
  return rawCity;
}

router.get("/", (req, res) => {
  const { city: rawCity, checkin, checkout } = req.query;

  const city = resolveCity(rawCity);

  let query = `
    SELECT p.*, 
      pi.image_path as image,
      ROUND(AVG(r.rating), 1) as rating,
      COUNT(r.id) as reviews_count
    FROM properties p 
    LEFT JOIN property_images pi ON pi.property_id = p.id 
      AND pi.id = (SELECT MIN(id) FROM property_images WHERE property_id = p.id)
    LEFT JOIN reviews r ON r.property_id = p.id
  `;

  const conditions = [];
  const params = [];

  if (city) {
    // Compară după diacritice stripped — atât coloana cât și parametrul
    conditions.push(`
      LOWER(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          p.city,
          'ș','s'),'ț','t'),'ă','a'),'â','a'),'î','i'),
          'Ș','s'),'Ț','t'),'Ă','a')
      ) = LOWER(
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
          ?,
          'ș','s'),'ț','t'),'ă','a'),'â','a'),'î','i'),
          'Ș','s'),'Ț','t'),'Ă','a')
      )
    `);
    params.push(city);
  }

  if (checkin && checkout) {
    conditions.push(`p.id NOT IN (
      SELECT property_id FROM reservations
      WHERE status != 'cancelled'
      AND check_in < ? AND check_out > ?
    )`);
    params.push(checkout, checkin);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " GROUP BY p.id";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get("/host", verifyToken, (req, res) => {
  db.all(
    `SELECT * FROM properties WHERE host_id = ?`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.get("/:id", (req, res) => {
  db.get(
    `SELECT p.*,
      ROUND(AVG(r.rating), 1) as rating,
      COUNT(r.id) as reviews_count
     FROM properties p
     LEFT JOIN reviews r ON r.property_id = p.id
     WHERE p.id = ?
     GROUP BY p.id`,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    }
  );
});

router.get("/:id/images", (req, res) => {
  db.all(
    `SELECT * FROM property_images WHERE property_id = ?`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post("/", verifyToken, upload.array("images", 10), async (req, res) => {
  const { title, description, price, address, city, country, bedrooms, bathrooms, max_guests, weekend_surcharge, cleaning_fee } = req.body;

  const rawFacilities = req.body.facilities;
  const facilities = Array.isArray(rawFacilities)
    ? rawFacilities.join(",")
    : rawFacilities || "";

  if (!title || !price || !address || !city || !country) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  let lat = null, lng = null;
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ", " + city + ", " + country)}&format=json&limit=1`,
      { headers: { "User-Agent": "StayFinder/1.0" } }
    );
    const geoData = await geoRes.json();
    if (geoData.length > 0) {
      lat = parseFloat(geoData[0].lat);
      lng = parseFloat(geoData[0].lon);
    }
  } catch (err) {
    console.error("Geocoding error:", err.message);
  }

  db.run(
    `INSERT INTO properties (host_id, title, description, price, address, city, country, bedrooms, bathrooms, max_guests, weekend_surcharge, cleaning_fee, facilities, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, title, description, price, address, city, country, bedrooms || 1, bathrooms || 1, max_guests || 1, weekend_surcharge || 0, cleaning_fee || 0, facilities, lat, lng],
    async function(err) {
      if (err) return res.status(500).json({ error: err.message });

      const propertyId = this.lastID;

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          try {
            const result = await new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                { folder: "stayfinder/properties" },
                (error, result) => error ? reject(error) : resolve(result)
              );
              stream.end(file.buffer);
            });
            db.run(`INSERT INTO property_images (property_id, image_path) VALUES (?, ?)`, [propertyId, result.secure_url]);
          } catch (uploadErr) {
            console.error("Image upload error:", uploadErr.message);
          }
        }
      }

      res.json({ success: true, property_id: propertyId });
    }
  );
});

router.put("/:id", verifyToken, upload.array("images", 10), async (req, res) => {
  const { title, description, price, address, city, country, bedrooms, bathrooms, max_guests, weekend_surcharge, cleaning_fee } = req.body;

  const rawFacilities = req.body.facilities;
  const facilities = Array.isArray(rawFacilities)
    ? rawFacilities.join(",")
    : rawFacilities || "";

  db.run(
    `UPDATE properties SET title=?, description=?, price=?, address=?, city=?, country=?, bedrooms=?, bathrooms=?, max_guests=?, weekend_surcharge=?, cleaning_fee=?, facilities=? WHERE id=? AND host_id=?`,
    [title, description, price, address, city, country, bedrooms, bathrooms, max_guests, weekend_surcharge || 0, cleaning_fee || 0, facilities, req.params.id, req.user.id],
    async function(err) {
      if (err) return res.status(500).json({ error: err.message });

      if (req.files && req.files.length > 0) {
        db.run("DELETE FROM property_images WHERE property_id = ?", [req.params.id]);
        for (const file of req.files) {
          try {
            const result = await new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                { folder: "stayfinder/properties" },
                (error, result) => error ? reject(error) : resolve(result)
              );
              stream.end(file.buffer);
            });
            db.run("INSERT INTO property_images (property_id, image_path) VALUES (?, ?)", [req.params.id, result.secure_url]);
          } catch (err) {
            console.error("Upload error:", err.message);
          }
        }
      }

      res.json({ success: true });
    }
  );
});

router.delete("/:id", verifyToken, (req, res) => {
  db.run(
    `DELETE FROM properties WHERE id = ? AND host_id = ?`,
    [req.params.id, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

module.exports = router;