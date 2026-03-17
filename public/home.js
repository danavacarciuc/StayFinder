function getRatingLabel(rating) {
  if (rating >= 5) return "Excellent";
  if (rating >= 4) return "Great";
  if (rating >= 3) return "Good";
  if (rating >= 2) return "Average";
  return "Poor";
}

function normalizeSearchCity(str) {
  if (!str) return "";
  const aliases = {
    "bucuresti": "Bucharest", "bucharest": "Bucharest", "bucarest": "Bucharest",
    "brasov": "Brasov", "brașov": "Brasov", "kronstadt": "Brasov",
    "cluj": "Cluj-Napoca", "cluj napoca": "Cluj-Napoca", "cluj-napoca": "Cluj-Napoca",
    "kolozsvar": "Cluj-Napoca", "klausenburg": "Cluj-Napoca",
    "constanta": "Constanta", "constanța": "Constanta",
    "chisinau": "Chisinau", "chișinău": "Chisinau", "kishinev": "Chisinau",
    "sinaia": "Sinaia",
    "paris": "Paris", "barcelona": "Barcelona",
    "rome": "Rome", "roma": "Rome",
    "london": "London", "londra": "London",
    "amsterdam": "Amsterdam",
    "prague": "Prague", "praga": "Prague", "praha": "Prague",
    "vienna": "Vienna", "viena": "Vienna", "wien": "Vienna",
    "milan": "Milan", "milano": "Milan",
    "berlin": "Berlin",
    "budapest": "Budapest", "budapesta": "Budapest",
  };
  const normalized = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return aliases[normalized] || str;
}

function buildPropertyCard(property, checkin, checkout, guests) {
  const card = document.createElement("div");
  card.className = "property-card";

  const rating = Number(property.rating || 0);
  const reviews = property.reviews_count || 0;

  const linkParams = new URLSearchParams({ id: property.id });
  if (checkin) linkParams.set("checkin", checkin);
  if (checkout) linkParams.set("checkout", checkout);
  if (guests) linkParams.set("guests", guests);

  // Match reasons badge
  const reasonsHtml = property.matchReasons?.length
    ? `<div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap;">
        ${property.matchReasons.map(r => `
          <span style="background:#f0f7ff;color:#1a56db;font-size:11px;font-weight:600;
            padding:2px 8px;border-radius:10px;">✓ ${r}</span>
        `).join("")}
       </div>`
    : "";

  card.innerHTML = `
    <div class="property-image-wrapper">
      <img src="${property.image || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994'}" />
      <button class="favorite-btn" data-id="${property.id}">
        <i class="fa-regular fa-heart"></i>
      </button>
    </div>
    <div class="property-content">
      <div class="property-title">${property.title}</div>
      <div class="property-location">${property.address || property.city}</div>
      <div class="property-price">$${property.price} / night</div>
      <div class="rating-section">
        <div class="rating-top">
          <div class="rating-circle">${rating.toFixed(1)}</div>
          <div class="rating-label">${getRatingLabel(rating)}</div>
        </div>
        <div class="review-count">${reviews} reviews</div>
      </div>
      ${reasonsHtml}
    </div>
  `;

  card.addEventListener("click", (e) => {
    if (e.target.closest(".favorite-btn")) return;
    window.location.href = `/property.html?${linkParams.toString()}`;
  });

  return card;
}

async function loadProperties() {
  const token = localStorage.getItem("token");
  const container = document.getElementById("propertiesContainer");
  const titleEl = document.getElementById("propertiesSectionTitle");
  const prefTag = document.getElementById("preferencesTag");

  container.innerHTML = `<div style="text-align:center;padding:40px;color:#888;grid-column:1/-1;">
    <i class="fa-solid fa-spinner" style="animation:spin 1s linear infinite;font-size:1.5rem;"></i>
  </div>`;

  // Dacă e logat, încearcă recommendations
  if (token) {
    try {
      const res = await fetch("/api/analytics/recommendations", {
        headers: { Authorization: "Bearer " + token }
      });

      if (res.ok) {
        const data = await res.json();
        const { recommendations, isPersonalized, preferences } = data;
        _allHomeProps = recommendations;
        container.innerHTML = "";

        if (isPersonalized) {
          titleEl.textContent = "✨ Recommended for you";
          // Arată preferințele detectate
          if (preferences?.topCities?.length) {
            prefTag.style.display = "block";
            prefTag.textContent = `Based on your interest in ${preferences.topCities.join(", ")} · $${preferences.priceRange.min}–$${preferences.priceRange.max}/night`;
          }
        } else {
          titleEl.textContent = "🌟 Top rated properties";
        }

        if (!recommendations.length) {
          container.innerHTML = "<p style='color:#888;grid-column:1/-1;'>No recommendations available yet.</p>";
        } else {
          recommendations.forEach(p => container.appendChild(buildPropertyCard(p)));
        }

        await initFavoriteButtons();
        return;
      }
    } catch(e) {}
  }

  // Fallback — proprietăți normale
  try {
    const res = await fetch("/api/properties");
    const properties = await res.json();
    _allHomeProps = properties;
    container.innerHTML = "";
    titleEl.textContent = "Recommended properties";
    properties.forEach(p => container.appendChild(buildPropertyCard(p)));
    await initFavoriteButtons();
  } catch(e) {
    container.innerHTML = "<p style='color:#888;grid-column:1/-1;'>Could not load properties.</p>";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const whereInput = document.getElementById("whereInput");
  const cityDropdown = document.getElementById("cityDropdown");
  let debounceTimer;

  if (!whereInput) return;

  whereInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    const query = whereInput.value.trim();
    if (query.length < 2) { cityDropdown.style.display = "none"; return; }

    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`,
          { headers: { "Accept-Language": "en", "User-Agent": "StayFinder/1.0" } }
        );
        const data = await res.json();
        if (!data.length) { cityDropdown.style.display = "none"; return; }

        cityDropdown.innerHTML = data.map(place => {
          const parts = place.display_name.split(",").slice(0, 2).join(",").trim();
          return `<div class="city-suggestion" data-name="${parts}">📍 ${parts}</div>`;
        }).join("");
        cityDropdown.style.display = "block";

        cityDropdown.querySelectorAll(".city-suggestion").forEach(item => {
          item.addEventListener("click", () => {
            whereInput.value = item.dataset.name.split(",")[0].trim();
            cityDropdown.style.display = "none";
          });
        });
      } catch (err) { console.error("Nominatim error:", err); }
    }, 400);
  });

  document.addEventListener("click", (e) => {
    if (!whereInput.contains(e.target) && !cityDropdown.contains(e.target)) {
      cityDropdown.style.display = "none";
    }
  });

  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      const raw = document.getElementById("whereInput").value.trim().split(",")[0].trim();
      const cityOnly = normalizeSearchCity(raw);
      const checkin = document.getElementById("checkinInput").value;
      const checkout = document.getElementById("checkoutInput").value;
      const guests = document.getElementById("guestsInput").value;

      if (cityOnly) {
        window.location.href = `/properties.html?city=${encodeURIComponent(cityOnly)}&checkin=${checkin}&checkout=${checkout}&guests=${guests}`;
      } else {
        window.location.href = `/properties-map.html?checkin=${checkin}&checkout=${checkout}&guests=${guests}`;
      }
    });
  }
});

loadProperties();

// Filtrare pe homepage
let _allHomeProps = [];

function applyHomePropFilters(filters = {}) {
  let result = [..._allHomeProps];

  if (filters.minPrice) result = result.filter(p => p.price >= filters.minPrice);
  if (filters.maxPrice) result = result.filter(p => p.price <= filters.maxPrice);
  if (filters.bedrooms) {
    if (filters.bedrooms === "4") result = result.filter(p => (p.bedrooms || 1) >= 4);
    else result = result.filter(p => (p.bedrooms || 1) == parseInt(filters.bedrooms));
  }
  if (filters.minRating) result = result.filter(p => (p.rating || 0) >= filters.minRating);
  if (filters.facilities?.length) {
    result = result.filter(p => {
      const pf = (p.facilities || "").split(",").map(f => f.trim());
      return filters.facilities.every(f => pf.includes(f));
    });
  }
  switch(filters.sort) {
    case "price_asc": result.sort((a,b) => a.price - b.price); break;
    case "price_desc": result.sort((a,b) => b.price - a.price); break;
    case "rating_desc": result.sort((a,b) => (b.rating||0) - (a.rating||0)); break;
    case "reviews_desc": result.sort((a,b) => (b.reviews_count||0) - (a.reviews_count||0)); break;
  }

  const container = document.getElementById("propertiesContainer");
  container.innerHTML = "";
  if (!result.length) {
    container.innerHTML = "<p style='color:#888;grid-column:1/-1;text-align:center;padding:40px;'>No properties match your filters.</p>";
    return;
  }
  result.forEach(p => container.appendChild(buildPropertyCard(p)));
  initFavoriteButtons();
}

window.addEventListener("scroll", function () {
  const navbar = document.querySelector(".navbar");
  if (window.scrollY > 80) navbar.classList.add("scrolled");
  else navbar.classList.remove("scrolled");
});

async function loadCities() {
  const res = await fetch("/api/cities");
  const cities = await res.json();
  const container = document.getElementById("citiesContainer");
  container.innerHTML = "";
  cities.forEach(city => {
    const cityDiv = document.createElement("div");
    cityDiv.className = "city";
    cityDiv.innerHTML = `<img src="${city.image}" /><p>${city.name}</p>`;
    cityDiv.addEventListener("click", () => {
      window.location.href = `properties.html?city=${encodeURIComponent(normalizeSearchCity(city.name))}`;
    });
    container.appendChild(cityDiv);
  });
}

loadCities();