const upload = require("../config/upload");

router.post("/", upload.array("images"), (req, res) => {

  const {
    title, description, price,
    address, city, country,
    bedrooms, bathrooms, max_guests,
    lat, lng
  } = req.body;

  const host_id = req.user.id; // după ce facem auth

  db.run(`
    INSERT INTO properties
    (host_id, title, description, price, address, city, country,
     bedrooms, bathrooms, max_guests, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  [host_id, title, description, price, address, city, country,
   bedrooms, bathrooms, max_guests, lat, lng],
  function(err) {

    const propertyId = this.lastID;

    // save images
    req.files.forEach(file => {
      db.run(`
        INSERT INTO property_images (property_id, image_path)
        VALUES (?, ?)
      `, [propertyId, file.path]);
    });

    res.json({ success: true });
  });
});