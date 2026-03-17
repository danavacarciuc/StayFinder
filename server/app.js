require("dotenv").config();

const express = require("express");
const session = require("express-session");
const passport = require("passport");

require("./config/db");
require("./config/passport");

const propertyRoutes = require("./routes/properties");
const reservationRoutes = require("./routes/reservations");
const authRoutes = require("./routes/auth");
const citiesRoutes = require("./routes/cities");
const uploadRoute = require("./routes/upload");
const usersRoutes = require("./routes/users");
const reviewsRoutes = require("./routes/reviews");
const wishlistRoutes = require("./routes/wishlist")
const adminRoutes = require("./routes/admin");



const app = express();

// ===== Middleware =====
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use("/uploads", express.static("uploads"));

app.use(passport.initialize());
app.use(passport.session());

// ===== Routes =====
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/cities", citiesRoutes);
app.use("/api/upload", uploadRoute);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", require("./routes/messages"));

// ===== Server Start =====
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});