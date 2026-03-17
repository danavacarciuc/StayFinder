const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database(path.join(__dirname, "server/database.sqlite"));

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guest_id INTEGER NOT NULL,
      host_id INTEGER NOT NULL,
      property_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guest_id) REFERENCES users(id),
      FOREIGN KEY (host_id) REFERENCES users(id),
      FOREIGN KEY (property_id) REFERENCES properties(id)
    )
  `, (err) => {
    if (err) console.log("conversations:", err.message);
    else console.log("✅ Table conversations created");
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.log("messages:", err.message);
    else console.log("✅ Table messages created");
  });

  db.close(() => console.log("Done!"));
});