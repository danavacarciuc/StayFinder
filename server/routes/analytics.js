const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyToken } = require("../middleware/auth");

// Date complete pentru analytics dashboard
router.get("/host", verifyToken, async (req, res) => {
  const hostId = req.user.id;

  try {
    // 1. Proprietățile hostului
    const properties = await new Promise((resolve, reject) => {
      db.all(`SELECT id, title, city, price FROM properties WHERE host_id = ?`, [hostId], (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });

    if (!properties.length) return res.json({ empty: true });

    const propIds = properties.map(p => p.id);
    const placeholders = propIds.map(() => "?").join(",");

    // 2. Toate rezervările pe proprietățile hostului
    const reservations = await new Promise((resolve, reject) => {
      db.all(`
        SELECT r.*, p.title as property_title, p.price as property_price, p.city
        FROM reservations r
        JOIN properties p ON p.id = r.property_id
        WHERE r.property_id IN (${placeholders})
        ORDER BY r.check_in ASC
      `, propIds, (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });

    // 3. Review-uri
    const reviews = await new Promise((resolve, reject) => {
      db.all(`
        SELECT rv.*, p.title as property_title
        FROM reviews rv
        JOIN properties p ON p.id = rv.property_id
        WHERE rv.property_id IN (${placeholders})
      `, propIds, (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });

    // 4. Media prețurilor din același oraș (pentru comparație)
    const cityAvgPrices = await new Promise((resolve, reject) => {
      db.all(`
        SELECT city, ROUND(AVG(price), 2) as avg_price, COUNT(*) as total_props
        FROM properties
        GROUP BY city
      `, [], (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });

    // ============ ALGORITMI DE ANALIZĂ ============

    const today = new Date();

    // A. Venituri lunare (ultimele 12 luni)
    const monthlyRevenue = {};
    const monthlyOccupancy = {}; // zile ocupate per lună

    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenue[key] = 0;
      monthlyOccupancy[key] = 0;
    }

    reservations.forEach(r => {
      if (r.status === "cancelled") return;
      const checkIn = new Date(r.check_in + "T00:00:00");
      const checkOut = new Date(r.check_out + "T00:00:00");

      // Iterează zilele rezervării
      const current = new Date(checkIn);
      while (current < checkOut) {
        const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
        if (monthlyOccupancy[key] !== undefined) {
          monthlyOccupancy[key]++;
        }
        current.setDate(current.getDate() + 1);
      }

      // Venituri — adaugă la luna check-in
      const key = `${checkIn.getFullYear()}-${String(checkIn.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyRevenue[key] !== undefined) {
        monthlyRevenue[key] += r.total_price || 0;
      }
    });

    // B. Rata de ocupare per proprietate
    // Zile disponibile = 365, zile ocupate = suma nopților rezervate confirmed
    const occupancyByProp = {};
    properties.forEach(p => { occupancyByProp[p.id] = { title: p.title, city: p.city, price: p.price, bookedDays: 0, revenue: 0, reviewCount: 0, avgRating: 0 }; });

    reservations.forEach(r => {
      if (r.status === "cancelled") return;
      if (!occupancyByProp[r.property_id]) return;
      const nights = Math.round((new Date(r.check_out) - new Date(r.check_in)) / (1000 * 60 * 60 * 24));
      occupancyByProp[r.property_id].bookedDays += nights;
      occupancyByProp[r.property_id].revenue += r.total_price || 0;
    });

    reviews.forEach(rv => {
      if (!occupancyByProp[rv.property_id]) return;
      occupancyByProp[rv.property_id].reviewCount++;
      occupancyByProp[rv.property_id].avgRating += rv.rating;
    });

    // Calculează rata de ocupare și rating mediu
    Object.values(occupancyByProp).forEach(p => {
      p.occupancyRate = Math.min(100, Math.round((p.bookedDays / 365) * 100));
      p.avgRating = p.reviewCount > 0 ? Math.round((p.avgRating / p.reviewCount) * 10) / 10 : 0;
    });

    // C. Top 5 proprietăți după venituri
    const topByRevenue = Object.entries(occupancyByProp)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // D. Top 5 proprietăți după ocupare
    const topByOccupancy = Object.entries(occupancyByProp)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.occupancyRate - a.occupancyRate)
      .slice(0, 5);

    // E. Comparație preț host vs media orașului
    const cityComparison = {};
    const cityAvgMap = {};
    cityAvgPrices.forEach(c => { cityAvgMap[c.city] = c.avg_price; });

    properties.forEach(p => {
      if (!cityComparison[p.city]) {
        cityComparison[p.city] = {
          city: p.city,
          hostAvgPrice: 0,
          marketAvgPrice: cityAvgMap[p.city] || 0,
          propCount: 0
        };
      }
      cityComparison[p.city].hostAvgPrice += p.price;
      cityComparison[p.city].propCount++;
    });
    Object.values(cityComparison).forEach(c => {
      c.hostAvgPrice = Math.round(c.hostAvgPrice / c.propCount);
    });

    // F. Statistici generale
    const confirmedRes = reservations.filter(r => r.status === "confirmed");
    const cancelledRes = reservations.filter(r => r.status === "cancelled");
    const totalRevenue = confirmedRes.reduce((s, r) => s + (r.total_price || 0), 0);
    const avgRating = reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

    // G. Distribuție rating-uri
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => { ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1; });

    // H. Rezervări per zi a săptămânii (pattern)
    const bookingsByDayOfWeek = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    reservations.forEach(r => {
      if (r.status === "cancelled") return;
      const day = dayNames[new Date(r.check_in + "T00:00:00").getDay()];
      bookingsByDayOfWeek[day]++;
    });

    res.json({
      summary: {
        totalProperties: properties.length,
        totalReservations: reservations.length,
        confirmedReservations: confirmedRes.length,
        cancelledReservations: cancelledRes.length,
        totalRevenue: Math.round(totalRevenue),
        avgRating,
        totalReviews: reviews.length,
        cancellationRate: reservations.length > 0
          ? Math.round((cancelledRes.length / reservations.length) * 100)
          : 0,
      },
      monthlyRevenue: Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue: Math.round(revenue) })),
      monthlyOccupancy: Object.entries(monthlyOccupancy).map(([month, days]) => ({ month, days })),
      topByRevenue,
      topByOccupancy,
      cityComparison: Object.values(cityComparison),
      ratingDistribution: Object.entries(ratingDistribution).map(([rating, count]) => ({ rating: parseInt(rating), count })),
      bookingsByDayOfWeek: Object.entries(bookingsByDayOfWeek).map(([day, count]) => ({ day, count })),
      occupancyByProp: Object.entries(occupancyByProp).map(([id, data]) => ({ id, ...data })),
      revenueForecast: generateForecast(Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue: Math.round(revenue) }))),
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ALGORITM REVENUE FORECAST - Regresie Liniară =====
function generateForecast(monthlyRevenue) {
  // Folosim ultimele 6 luni cu date reale
  const recent = monthlyRevenue.slice(-6);
  const n = recent.length;

  if (n < 2) return { forecast: [], trend: "insufficient_data", historical: recent };

  // Dacă toate veniturile sunt 0, returnează insuficient
  const totalRev = recent.reduce((s, m) => s + m.revenue, 0);
  if (totalRev === 0) return { forecast: [], trend: "insufficient_data", historical: recent };

  // Regresie liniară: y = a + b*x
  const xValues = recent.map((_, i) => i);
  const yValues = recent.map(m => m.revenue);

  const sumX = xValues.reduce((s, x) => s + x, 0);
  const sumY = yValues.reduce((s, y) => s + y, 0);
  const sumXY = xValues.reduce((s, x, i) => s + x * yValues[i], 0);
  const sumX2 = xValues.reduce((s, x) => s + x * x, 0);

  const denom = (n * sumX2 - sumX * sumX);
  if (denom === 0) return { forecast: [], trend: "insufficient_data", historical: recent };

  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;

  // R²
  const yMean = sumY / n;
  const ssTot = yValues.reduce((s, y) => s + Math.pow(y - yMean, 2), 0);
  const ssRes = yValues.reduce((s, y, i) => s + Math.pow(y - (a + b * xValues[i]), 2), 0);
  const r2 = ssTot > 0 ? Math.max(0, Math.round((1 - ssRes / ssTot) * 100) / 100) : 0;

  let trend = "stable";
  if (b > 50) trend = "growing";
  else if (b < -50) trend = "declining";

  // Predicții pentru următoarele 3 luni
  const lastMonth = recent[recent.length - 1].month;
  const [lastYear, lastMonthNum] = lastMonth.split("-").map(Number);

  const stdDev = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0;
  const margin = Math.round(stdDev * 1.5);

  const forecast = [];
  for (let i = 1; i <= 3; i++) {
    let month = lastMonthNum + i;
    let year = lastYear;
    if (month > 12) { month -= 12; year++; }
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    const predictedX = n - 1 + i;
    const predictedRevenue = Math.max(0, Math.round(a + b * predictedX));

    forecast.push({
      month: monthKey,
      predicted: predictedRevenue,
      low: Math.max(0, predictedRevenue - margin),
      high: predictedRevenue + margin,
      isForecast: true,
    });
  }

  return {
    historical: recent,
    forecast,
    trend,
    slope: Math.round(b),
    r2,
    confidence: r2 > 0.7 ? "high" : r2 > 0.4 ? "medium" : "low",
  };
}

module.exports = router;

// Platform Analytics - doar pentru admin
router.get("/platform", verifyToken, async (req, res) => {
  if (!req.user.is_admin) return res.status(403).json({ error: "Admins only" });

  try {
    const db_all = (sql, params = []) => new Promise((resolve, reject) => {
      const db = require("../config/db");
      db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
    });
    const db_get = (sql, params = []) => new Promise((resolve, reject) => {
      const db = require("../config/db");
      db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
    });

    // 1. Summary general
    const summary = await db_get(`
      SELECT
        (SELECT COUNT(*) FROM users) as totalUsers,
        (SELECT COUNT(*) FROM users WHERE is_host = 1) as totalHosts,
        (SELECT COUNT(*) FROM users WHERE is_host = 0 AND is_admin = 0) as totalGuests,
        (SELECT COUNT(*) FROM properties) as totalProperties,
        (SELECT COUNT(*) FROM reservations) as totalReservations,
        (SELECT COUNT(*) FROM reservations WHERE status = 'confirmed') as confirmedReservations,
        (SELECT COUNT(*) FROM reservations WHERE status = 'cancelled') as cancelledReservations,
        (SELECT ROUND(SUM(total_price), 0) FROM reservations WHERE status = 'confirmed') as totalRevenue,
        (SELECT COUNT(*) FROM reviews) as totalReviews,
        (SELECT ROUND(AVG(rating), 1) FROM reviews) as avgRating
    `);

    // 2. Venituri lunare (ultimele 12 luni) - toată platforma
    const today = new Date();
    const monthlyRevenue = {};
    const monthlyBookings = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenue[key] = 0;
      monthlyBookings[key] = 0;
    }

    const allReservations = await db_all(`
      SELECT check_in, check_out, total_price, status FROM reservations
    `);

    allReservations.forEach(r => {
      if (r.status !== "confirmed") return;
      const key = r.check_in.substring(0, 7);
      if (monthlyRevenue[key] !== undefined) {
        monthlyRevenue[key] += r.total_price || 0;
        monthlyBookings[key]++;
      }
    });

    // 3. Top 10 orașe după număr proprietăți
    const topCities = await db_all(`
      SELECT city, country, COUNT(*) as property_count,
        ROUND(AVG(price), 0) as avg_price,
        (SELECT COUNT(*) FROM reservations r 
         JOIN properties p2 ON p2.id = r.property_id 
         WHERE p2.city = p.city AND r.status = 'confirmed') as bookings
      FROM properties p
      GROUP BY city
      ORDER BY property_count DESC
      LIMIT 10
    `);

    // 4. Top 10 hosturi după venituri
    const topHosts = await db_all(`
      SELECT u.id, u.name, u.email, u.avatar,
        COUNT(DISTINCT p.id) as property_count,
        ROUND(SUM(r.total_price), 0) as total_revenue,
        COUNT(r.id) as total_bookings
      FROM users u
      JOIN properties p ON p.host_id = u.id
      LEFT JOIN reservations r ON r.property_id = p.id AND r.status = 'confirmed'
      GROUP BY u.id
      ORDER BY total_revenue DESC
      LIMIT 10
    `);

    // 5. Distribuție prețuri (buckets)
    const priceBuckets = await db_all(`
      SELECT
        CASE
          WHEN price < 50 THEN 'Under $50'
          WHEN price < 100 THEN '$50-$100'
          WHEN price < 150 THEN '$100-$150'
          WHEN price < 200 THEN '$150-$200'
          WHEN price < 300 THEN '$200-$300'
          ELSE 'Over $300'
        END as bucket,
        COUNT(*) as count
      FROM properties
      GROUP BY bucket
      ORDER BY MIN(price)
    `);

    // 6. Rating distribution global
    const ratingDist = await db_all(`
      SELECT rating, COUNT(*) as count FROM reviews GROUP BY rating ORDER BY rating
    `);

    // 7. Rezervări per zi a săptămânii
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dowCounts = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
    allReservations.forEach(r => {
      if (r.status !== "confirmed") return;
      const day = dayNames[new Date(r.check_in + "T00:00:00").getDay()];
      dowCounts[day]++;
    });

    // 8. Înregistrări noi pe lună (useri)
    const newUsers = await db_all(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM users
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `);

    // 9. Proprietăți per continent
    const continentMap = {
      "France": "Europe", "Spain": "Europe", "Italy": "Europe", "UK": "Europe",
      "Netherlands": "Europe", "Czech Republic": "Europe", "Austria": "Europe",
      "Germany": "Europe", "Hungary": "Europe", "Romania": "Europe", "Turkey": "Europe",
      "USA": "North America", "Canada": "North America", "Mexico": "North America",
      "Brazil": "South America", "Argentina": "South America", "Colombia": "South America",
      "Japan": "Asia", "Thailand": "Asia", "Singapore": "Asia", "Indonesia": "Asia",
      "UAE": "Asia", "South Korea": "Asia", "India": "Asia",
      "South Africa": "Africa", "Morocco": "Africa", "Kenya": "Africa",
      "Australia": "Oceania", "New Zealand": "Oceania",
    };

    const allProps = await db_all(`SELECT country, COUNT(*) as count FROM properties GROUP BY country`);
    const continentData = {};
    allProps.forEach(p => {
      const continent = continentMap[p.country] || "Other";
      continentData[continent] = (continentData[continent] || 0) + p.count;
    });

    res.json({
      summary,
      monthlyRevenue: Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue: Math.round(revenue) })),
      monthlyBookings: Object.entries(monthlyBookings).map(([month, count]) => ({ month, count })),
      topCities,
      topHosts,
      priceBuckets,
      ratingDist,
      bookingsByDow: Object.entries(dowCounts).map(([day, count]) => ({ day, count })),
      newUsers: newUsers.reverse(),
      continentData: Object.entries(continentData).map(([continent, count]) => ({ continent, count })),
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Smart Price Suggester
router.get("/price-suggestion", async (req, res) => {
  const { city, bedrooms } = req.query;
  if (!city) return res.status(400).json({ error: "City required" });

  const db = require("../config/db");

  db.all(`
    SELECT p.price, p.bedrooms,
      ROUND(AVG(r.rating), 1) as avg_rating,
      COUNT(DISTINCT res.id) as booking_count
    FROM properties p
    LEFT JOIN reviews r ON r.property_id = p.id
    LEFT JOIN reservations res ON res.property_id = p.id AND res.status = 'confirmed'
    WHERE LOWER(p.city) = LOWER(?)
    GROUP BY p.id
  `, [city], (err, props) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!props.length) return res.json({ suggestion: null, message: "No data for this city yet." });

    const beds = parseInt(bedrooms) || 1;

    // ---- ALGORITM ----
    // 1. Filtrează proprietăți similare (±1 cameră)
    const similar = props.filter(p => Math.abs((p.bedrooms || 1) - beds) <= 1);
    const base = similar.length >= 3 ? similar : props;

    // 2. Calculează percentile 25, 50, 75
    const prices = base.map(p => p.price).sort((a, b) => a - b);
    const p25 = prices[Math.floor(prices.length * 0.25)];
    const p50 = prices[Math.floor(prices.length * 0.50)]; // mediana
    const p75 = prices[Math.floor(prices.length * 0.75)];

    // 3. Media ponderată: proprietățile cu mai multe rezervări cântăresc mai mult
    const totalWeight = base.reduce((s, p) => s + (p.booking_count + 1), 0);
    const weightedAvg = base.reduce((s, p) => s + p.price * (p.booking_count + 1), 0) / totalWeight;

    // 4. Ajustare per camere față de media din city
    const cityAvgBedrooms = props.reduce((s, p) => s + (p.bedrooms || 1), 0) / props.length;
    const bedroomMultiplier = 1 + (beds - cityAvgBedrooms) * 0.12;

    // 5. Scor final = media ponderată × ajustare camere, rotunjit la $5
    const rawSuggestion = weightedAvg * bedroomMultiplier;
    const suggestion = Math.round(rawSuggestion / 5) * 5;

    // 6. Competitivitate: compară cu mediana
    let competitiveness = "average";
    if (suggestion < p25) competitiveness = "budget";
    else if (suggestion > p75) competitiveness = "premium";
    else if (suggestion < p50) competitiveness = "competitive";

    const competitivenessLabels = {
      budget: { label: "Budget-friendly", color: "#1a56db" },
      competitive: { label: "Competitive", color: "#2e7d32" },
      average: { label: "Market average", color: "#e65100" },
      premium: { label: "Premium", color: "#7b1fa2" },
    };

    res.json({
      suggestion,
      city,
      bedrooms: beds,
      totalProperties: props.length,
      similarProperties: base.length,
      p25: Math.round(p25),
      p50: Math.round(p50),
      p75: Math.round(p75),
      weightedAvg: Math.round(weightedAvg),
      competitiveness,
      competitivenessLabel: competitivenessLabels[competitiveness].label,
      competitivenessColor: competitivenessLabels[competitiveness].color,
      message: `Based on ${base.length} similar properties in ${city}`,
    });
  });
});

// Recommendation Engine pentru guest
router.get("/recommendations", verifyToken, async (req, res) => {
  const userId = req.user.id;
  const db = require("../config/db");

  const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
  });
  const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
  });

  try {
    // 1. Istoricul rezervărilor userului
    const reservations = await all(`
      SELECT r.*, p.city, p.price, p.bedrooms, p.max_guests
      FROM reservations r
      JOIN properties p ON p.id = r.property_id
      WHERE r.guest_id = ? AND r.status = 'confirmed'
    `, [userId]);

    // 2. Wishlist-ul userului
    const wishlist = await all(`
      SELECT p.city, p.price, p.bedrooms
      FROM favorites f
      JOIN properties p ON p.id = f.property_id
      WHERE f.user_id = ?
    `, [userId]);

    // 3. Review-urile lăsate de user (preferințe de rating)
    const userReviews = await all(`
      SELECT rv.rating, p.city, p.price, p.bedrooms
      FROM reviews rv
      JOIN properties p ON p.id = rv.property_id
      WHERE rv.guest_id = ?
    `, [userId]);

    // 4. Proprietăți deja văzute/rezervate — le excludem
    const seenPropIds = await all(`
      SELECT property_id as id FROM reservations WHERE guest_id = ?
      UNION
      SELECT property_id as id FROM favorites WHERE user_id = ?
    `, [userId, userId]);
    const excludeIds = seenPropIds.map(r => r.id);

    // ===== ALGORITM DE SCORING =====

    // A. Extrage preferințele userului din istoric
    const allHistory = [...reservations, ...wishlist, ...userReviews];

    // Orașe preferate (frecvență)
    const cityFreq = {};
    allHistory.forEach(h => {
      if (h.city) cityFreq[h.city] = (cityFreq[h.city] || 0) + 1;
    });

    // Interval de preț preferat
    const prices = allHistory.filter(h => h.price).map(h => h.price);
    const avgPrice = prices.length ? prices.reduce((s, p) => s + p, 0) / prices.length : 100;
    const minPrice = Math.max(0, avgPrice * 0.5);
    const maxPrice = avgPrice * 2;

    // Număr mediu de camere preferat
    const bedrooms = allHistory.filter(h => h.bedrooms).map(h => h.bedrooms);
    const avgBedrooms = bedrooms.length ? Math.round(bedrooms.reduce((s, b) => s + b, 0) / bedrooms.length) : 1;

    // Rating minim preferat (din review-urile lăsate)
    const highRatedCities = userReviews.filter(r => r.rating >= 4).map(r => r.city);

    // B. Obține toate proprietățile (exclusiv cele deja văzute)
    const placeholders = excludeIds.length ? excludeIds.map(() => "?").join(",") : "0";
    const allProps = await all(`
      SELECT p.*,
        (SELECT image_path FROM property_images WHERE property_id = p.id LIMIT 1) as image,
        ROUND(AVG(r.rating), 1) as rating,
        COUNT(r.id) as reviews_count
      FROM properties p
      LEFT JOIN reviews r ON r.property_id = p.id
      WHERE p.id NOT IN (${placeholders})
      GROUP BY p.id
      HAVING COUNT(r.id) > 0
    `, excludeIds);

    // C. Calculează scor pentru fiecare proprietate
    const scored = allProps.map(p => {
      let score = 0;

      // 1. Bonus oraș preferat (max 40 pts)
      const cityBonus = (cityFreq[p.city] || 0) * 15;
      score += Math.min(40, cityBonus);

      // 2. Bonus preț în intervalul preferat (max 25 pts)
      if (p.price >= minPrice && p.price <= maxPrice) {
        const priceDiff = Math.abs(p.price - avgPrice) / avgPrice;
        score += Math.round((1 - priceDiff) * 25);
      }

      // 3. Bonus camere similare (max 15 pts)
      const bedroomDiff = Math.abs((p.bedrooms || 1) - avgBedrooms);
      if (bedroomDiff === 0) score += 15;
      else if (bedroomDiff === 1) score += 8;

      // 4. Bonus rating înalt (max 15 pts)
      const rating = p.rating || 0;
      score += Math.round(rating * 3); // max 15 pentru rating 5.0

      // 5. Bonus popularitate — proprietăți cu multe review-uri (max 10 pts)
      score += Math.min(10, Math.floor(p.reviews_count / 3));

      // 6. Bonus orașe cu review-uri bune de la user (max 10 pts)
      if (highRatedCities.includes(p.city)) score += 10;

      // 7. Penalizare preț prea mare față de preferință (max -15)
      if (p.price > maxPrice) score -= 15;

      return { ...p, score, matchReasons: buildReasons(p, cityFreq, avgPrice, avgBedrooms, highRatedCities) };
    });

    // D. Sortează după scor și ia top 12
    const recommendations = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    // E. Dacă userul e nou (fără istoric), returnează top rated
    if (allHistory.length === 0) {
      const topRated = await all(`
        SELECT p.*,
          (SELECT image_path FROM property_images WHERE property_id = p.id LIMIT 1) as image,
          ROUND(AVG(r.rating), 1) as rating,
          COUNT(r.id) as reviews_count
        FROM properties p
        LEFT JOIN reviews r ON r.property_id = p.id
        GROUP BY p.id
        HAVING COUNT(r.id) >= 2
        ORDER BY rating DESC, reviews_count DESC
        LIMIT 12
      `);
      return res.json({ recommendations: topRated, isPersonalized: false });
    }

    res.json({
      recommendations,
      isPersonalized: true,
      preferences: {
        topCities: Object.entries(cityFreq).sort((a,b) => b[1]-a[1]).slice(0,3).map(e=>e[0]),
        priceRange: { min: Math.round(minPrice), max: Math.round(maxPrice), avg: Math.round(avgPrice) },
        avgBedrooms,
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildReasons(p, cityFreq, avgPrice, avgBedrooms, highRatedCities) {
  const reasons = [];
  if (cityFreq[p.city]) reasons.push(`You liked ${p.city}`);
  if (Math.abs(p.price - avgPrice) / avgPrice < 0.3) reasons.push("Matches your budget");
  if (Math.abs((p.bedrooms || 1) - avgBedrooms) <= 1) reasons.push("Similar size");
  if (p.rating >= 4.5) reasons.push("Highly rated");
  if (highRatedCities.includes(p.city)) reasons.push("Great experience nearby");
  return reasons.slice(0, 2);
}

// Similarity Score între proprietăți
router.get("/similar/:id", async (req, res) => {
  const propId = parseInt(req.params.id);
  const db = require("../config/db");

  const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
  });
  const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
  });

  try {
    // Proprietatea de referință
    const target = await get(`
      SELECT p.*, ROUND(AVG(r.rating), 1) as rating, COUNT(r.id) as reviews_count
      FROM properties p
      LEFT JOIN reviews r ON r.property_id = p.id
      WHERE p.id = ?
      GROUP BY p.id
    `, [propId]);

    if (!target) return res.status(404).json({ error: "Property not found" });

    // Toate celelalte proprietăți din același oraș
    const candidates = await all(`
      SELECT p.*,
        (SELECT image_path FROM property_images WHERE property_id = p.id LIMIT 1) as image,
        ROUND(AVG(r.rating), 1) as rating,
        COUNT(r.id) as reviews_count
      FROM properties p
      LEFT JOIN reviews r ON r.property_id = p.id
      WHERE p.id != ? AND p.city = ?
      GROUP BY p.id
      HAVING COUNT(r.id) > 0
      LIMIT 100
    `, [propId, target.city]);

    // ===== ALGORITM COSINE SIMILARITY =====
    // Vectorizăm fiecare proprietate pe mai multe dimensiuni
    // și calculăm similaritatea față de proprietatea țintă

    const ALL_FACILITIES = ["WiFi","Pool","Parking","Air Conditioning","Kitchen",
      "Washing Machine","TV","Self Check-in","Hair Dryer","Dryer","Grill"];

    function vectorize(prop) {
      // 1. Preț normalizat (0-1) față de maxim din candidați + target
      const priceNorm = prop.price / 500;

      // 2. Camere normalizate
      const bedroomsNorm = (prop.bedrooms || 1) / 5;

      // 3. Guests normalizați
      const guestsNorm = (prop.max_guests || 2) / 10;

      // 4. Rating normalizat
      const ratingNorm = (prop.rating || 0) / 5;

      // 5. Facilități — vector binar (0/1 per facilitate)
      const propFacilities = (prop.facilities || "").split(",").map(f => f.trim());
      const facilityVector = ALL_FACILITIES.map(f => propFacilities.includes(f) ? 1 : 0);

      return [priceNorm, bedroomsNorm, guestsNorm, ratingNorm, ...facilityVector];
    }

    function cosineSimilarity(a, b) {
      // sim = (A·B) / (|A| * |B|)
      const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
      const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
      if (magA === 0 || magB === 0) return 0;
      return dot / (magA * magB);
    }

    // Ponderăm dimensiunile: prețul și camerele contează mai mult
    const WEIGHTS = [
      3.0,  // preț (important)
      2.5,  // camere (important)
      1.0,  // guests
      2.0,  // rating
      // facilități — câte 1.0 fiecare
      ...ALL_FACILITIES.map(() => 1.0)
    ];

    function weightedVector(vec) {
      return vec.map((v, i) => v * (WEIGHTS[i] || 1.0));
    }

    const targetVec = weightedVector(vectorize(target));

    const scored = candidates.map(prop => {
      const propVec = weightedVector(vectorize(prop));
      const similarity = cosineSimilarity(targetVec, propVec);

      // Bonus dacă e în aceeași gamă de preț (±25%)
      const priceDiff = Math.abs(prop.price - target.price) / target.price;
      const priceBonus = priceDiff < 0.25 ? 0.1 : 0;

      // Bonus dacă are același număr de camere
      const bedroomBonus = (prop.bedrooms || 1) === (target.bedrooms || 1) ? 0.05 : 0;

      const finalScore = Math.min(1, similarity + priceBonus + bedroomBonus);

      return {
        ...prop,
        similarity: Math.round(finalScore * 100),
      };
    });

    // Top 4 cele mai similare
    const similar = scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 4);

    res.json({ similar, targetCity: target.city });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;