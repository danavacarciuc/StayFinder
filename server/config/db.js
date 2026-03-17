const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(path.join(__dirname, "../database.sqlite"));

db.serialize(() => {

  db.run("PRAGMA foreign_keys = ON");

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    description TEXT,
    is_host INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    avatar TEXT,
    location TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
  CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    image TEXT
  )
`);

  db.run(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      host_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      bedrooms INTEGER DEFAULT 1,
      bathrooms INTEGER DEFAULT 1,
      lat REAL,
      lng REAL,
      max_guests INTEGER DEFAULT 1,
      weekend_surcharge REAL DEFAULT 0,
      facilities TEXT DEFAULT "",
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS property_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      guest_id INTEGER NOT NULL,
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      total_price REAL,
      status TEXT CHECK(status IN ('pending','confirmed','cancelled')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
      FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      guest_id INTEGER NOT NULL,
      rating REAL CHECK(rating >= 0 AND rating <= 10),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
      FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      property_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS facilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    )
  `);

    db.run(`
  CREATE TABLE IF NOT EXISTS property_facilities (
    property_id INTEGER,
    facility_id INTEGER,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
  )
`);


  
});



module.exports = db;