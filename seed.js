const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database(path.join(__dirname, "server/database.sqlite"));

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { if (err) reject(err); else resolve(this); });
});
const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
});
const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
});

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const TITLES = [
  "Luxury Penthouse in Bucharest", "Modern Studio Old Town", "Cozy Apartment Floreasca",
  "Designer Loft Dorobanți", "Bright Flat near Herăstrău", "Central Bucharest Suite",
  "Charming Studio Cotroceni", "Elegant Apartment Aviatorilor", "Riverside View Apartment",
  "Premium Loft City Center", "Stylish Studio Unirii", "Modern 2BR Tineretului",
  "Cozy Hideaway Drumul Taberei", "Upscale Flat Primăverii", "Sunny Studio Berceni",
  "Art Deco Apartment Victoriei", "Minimalist Loft Militari", "Panoramic View Suite",
  "Historic Center Flat", "Business District Apartment",
];

const DESCRIPTIONS = [
  "Stunning apartment with modern amenities in the heart of Bucharest.",
  "Perfect for business travelers and tourists alike. Fast WiFi included.",
  "Bright and spacious with natural light. Walking distance from main attractions.",
  "Fully equipped kitchen, great neighborhood, quiet and comfortable.",
  "Premium location with easy access to restaurants and nightlife.",
];

const FACILITIES_OPTIONS = [
  "WiFi,Kitchen,Air Conditioning,TV,Parking",
  "WiFi,Kitchen,TV,Washing Machine,Self Check-in",
  "WiFi,Air Conditioning,Kitchen,TV,Hair Dryer",
  "WiFi,Kitchen,Parking,TV,Grill",
  "WiFi,Pool,Kitchen,Air Conditioning,TV,Washing Machine",
];

const IMAGES = [
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
  "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800",
  "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
  "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800",
  "https://images.unsplash.com/photo-1516550893885-985c836c5bc8?w=800",
];

// Venituri lunare cu trend crescător (pentru regresie frumoasă)
// Ultimele 9 luni — creștere treptată cu variație naturală
const MONTHLY_REVENUE_TARGETS = [
  { month: -8, baseRevenue: 800 },
  { month: -7, baseRevenue: 950 },
  { month: -6, baseRevenue: 1100 },
  { month: -5, baseRevenue: 1350 },
  { month: -4, baseRevenue: 1200 },  // dip natural
  { month: -3, baseRevenue: 1600 },
  { month: -2, baseRevenue: 1850 },
  { month: -1, baseRevenue: 1700 },  // alt dip
  { month:  0, baseRevenue: 2100 },  // luna curentă parțială
];

async function seed() {
  console.log("Starting Dana host seed...");
  db.run("PRAGMA foreign_keys = OFF");

  // Găsim userul
  const user = await get(`SELECT id FROM users WHERE email = ?`, ["vacarciucdana23@stud.ase.ro"]);
  if (!user) {
    console.error("User not found!");
    db.close();
    return;
  }

  // Asigurăm că e host
  await run(`UPDATE users SET is_host = 1 WHERE id = ?`, [user.id]);
  console.log(`✅ User found: id=${user.id}`);

  // Găsim guests existenți
  const guests = await all(`SELECT id FROM users WHERE is_host = 0 AND id != ? LIMIT 20`, [user.id]);
  if (!guests.length) {
    console.error("No guests found!");
    db.close();
    return;
  }
  console.log(`✅ Found ${guests.length} guests`);

  // Creăm 20 proprietăți în Bucharest
  const propIds = [];
  for (let i = 0; i < 20; i++) {
    const price = rand(60, 180);
    const result = await run(`
      INSERT INTO properties (host_id, title, description, price, address, city, country, bedrooms, bathrooms, max_guests, cleaning_fee, facilities, lat, lng)
      VALUES (?, ?, ?, ?, ?, 'Bucharest', 'Romania', ?, 1, ?, ?, ?, ?, ?)
    `, [
      user.id,
      TITLES[i % TITLES.length],
      pick(DESCRIPTIONS),
      price,
      `Strada ${pick(["Victoriei", "Unirii", "Floreasca", "Dorobanților", "Aviatorilor"])} ${rand(1, 100)}`,
      rand(1, 3),
      rand(2, 6),
      rand(20, 50),
      pick(FACILITIES_OPTIONS),
      44.4268 + (Math.random() - 0.5) * 0.05,
      26.1025 + (Math.random() - 0.5) * 0.05,
    ]);

    const propId = result.lastID;
    propIds.push({ id: propId, price });

    // Imagine
    await run(`INSERT INTO property_images (property_id, image_path) VALUES (?, ?)`,
      [propId, IMAGES[i % IMAGES.length]]);
  }
  console.log(`✅ Created ${propIds.length} properties`);

  // Creăm rezervări distribuite pe luni cu venituri targetate
  const today = new Date();
  let totalReservations = 0;

  for (const target of MONTHLY_REVENUE_TARGETS) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() + target.month, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth(); // 0-indexed

    let monthRevenue = 0;
    let attempts = 0;

    while (monthRevenue < target.baseRevenue * 0.8 && attempts < 50) {
      attempts++;

      // Alege o proprietate random
      const prop = pick(propIds);
      const nights = rand(2, 7);

      // Dată random în luna respectivă
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startDay = rand(1, Math.max(1, daysInMonth - nights));
      const checkIn = `${year}-${String(month + 1).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
      const checkOut = addDays(checkIn, nights);
      const total = nights * prop.price;

      // Verifică overlap
      const overlap = await get(`
        SELECT id FROM reservations
        WHERE property_id = ? AND status = 'confirmed'
        AND check_in < ? AND check_out > ?
      `, [prop.id, checkOut, checkIn]);

      if (overlap) continue;

      const guest = pick(guests);
      await run(`
        INSERT INTO reservations (property_id, guest_id, check_in, check_out, total_price, status, payment_status)
        VALUES (?, ?, ?, ?, ?, 'confirmed', 'paid')
      `, [prop.id, guest.id, checkIn, checkOut, total]);

      monthRevenue += total;
      totalReservations++;

      // Adaugă review dacă luna e trecută
      const checkOutDate = new Date(checkOut + "T00:00:00");
      if (checkOutDate < today) {
        const existing = await get(`SELECT id FROM reviews WHERE property_id = ? AND guest_id = ?`, [prop.id, guest.id]);
        if (!existing) {
          const rating = rand(4, 5);
          const comments = [
            "Fantastic stay! Everything was perfect.",
            "Great location, very clean and comfortable.",
            "Highly recommended! Will come back.",
            "Amazing host, beautiful apartment.",
            "Perfect for our trip, loved every moment.",
          ];
          await run(`INSERT INTO reviews (property_id, guest_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)`,
            [prop.id, guest.id, rating, pick(comments), checkOut + " 10:00:00"]);
        }
      }
    }

    console.log(`  Month ${target.month}: target=$${target.baseRevenue}, actual=$${monthRevenue} (${attempts} attempts)`);
  }

  console.log(`\n✅ Created ${totalReservations} reservations`);

  // Stats finale
  const propCount = (await get(`SELECT COUNT(*) as c FROM properties WHERE host_id = ?`, [user.id])).c;
  const resCount = (await get(`SELECT COUNT(*) as c FROM reservations r JOIN properties p ON p.id = r.property_id WHERE p.host_id = ?`, [user.id])).c;
  const revCount = (await get(`SELECT COUNT(*) as c FROM reviews rv JOIN properties p ON p.id = rv.property_id WHERE p.host_id = ?`, [user.id])).c;

  console.log("\n=== STATS PENTRU DANA ===");
  console.log(`Properties: ${propCount}`);
  console.log(`Reservations: ${resCount}`);
  console.log(`Reviews: ${revCount}`);
  console.log("=========================");
  console.log("✅ Done! Analytics dashboard should now show proper forecast.");

  db.close();
}

seed().catch(err => {
  console.error(err);
  db.close();
});