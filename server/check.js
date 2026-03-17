const db = require('./config/db');

db.all("SELECT id, address, city, country FROM properties WHERE lat IS NULL", [], async (err, rows) => {
  for (const p of rows) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(p.address + ", " + p.city + ", " + p.country)}&format=json&limit=1`,
        { headers: { "User-Agent": "StayFinder/1.0" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        db.run("UPDATE properties SET lat = ?, lng = ? WHERE id = ?", [parseFloat(data[0].lat), parseFloat(data[0].lon), p.id]);
        console.log(`Updated ${p.city}: ${data[0].lat}, ${data[0].lon}`);
      }
    } catch (e) {
      console.error("Error:", e.message);
    }
    await new Promise(r => setTimeout(r, 1000)); // delay pt Nominatim rate limit
  }
});