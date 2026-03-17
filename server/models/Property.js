const db = require("../config/db");

exports.getAll = (callback) => {
  db.all("SELECT * FROM properties", [], callback);
};