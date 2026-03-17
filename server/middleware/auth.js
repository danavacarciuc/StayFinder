const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user.is_admin) return res.status(403).json({ error: "Admins only" });
  next();
}
module.exports = { verifyToken, requireRole, requireAdmin };

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role)
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

module.exports = { verifyToken, requireRole };