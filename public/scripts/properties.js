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
    "chisinau": "Chisinau", "chișinău": "Chisinau",
    "sinaia": "Sinaia", "paris": "Paris", "barcelona": "Barcelona",
    "rome": "Rome", "roma": "Rome", "london": "London", "londra": "London",
    "amsterdam": "Amsterdam", "prague": "Prague", "praga": "Prague", "praha": "Prague",
    "vienna": "Vienna", "viena": "Vienna", "wien": "Vienna",
    "milan": "Milan", "milano": "Milan", "berlin": "Berlin",
    "budapest": "Budapest", "budapesta": "Budapest",
  };
  const normalized = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return aliases[normalized] || str;
}

const params = new URLSearchParams(window.location.search);
const cityId = params.get("city");
const checkinParam = params.get("checkin");
const checkoutParam = params.get("checkout");
const guestsParam = params.get("guests");

// Stare filtre
let allProperties = [];
let activeFilters = {
  minPrice: null,
  maxPrice: null,
  bedrooms: null,
  minRating: null,
  facilities: [],
  sort: "",
};

document.addEventListener("DOMContentLoaded", () => {
  if (cityId) document.getElementById("searchInput").value = cityId;
  if (checkinParam) document.getElementById("checkinInput").value = checkinParam;
  if (checkoutParam) document.getElementById("checkoutInput").value = checkoutParam;
  if (guestsParam) document.getElementById("guestsInput").value = guestsParam;

  const searchBtn = document.querySelector(".inner-nav-search-btn");
  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      const raw = document.getElementById("searchInput").value.trim().split(",")[0].trim();
      const city = normalizeSearchCity(raw);
      const checkin = document.getElementById("checkinInput").value;
      const checkout = document.getElementById("checkoutInput").value;
      const guests = document.getElementById("guestsInput").value;
      if (city) {
        window.location.href = `/properties.html?city=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}&guests=${guests}`;
      } else {
        window.location.href = `/properties-map.html`;
      }
    });
  }
});

function filterAndSort(properties) {
  let result = [...properties];

  if (activeFilters.minPrice !== null) result = result.filter(p => p.price >= activeFilters.minPrice);
  if (activeFilters.maxPrice !== null) result = result.filter(p => p.price <= activeFilters.maxPrice);

  if (activeFilters.bedrooms) {
    const b = activeFilters.bedrooms;
    if (b === "4") result = result.filter(p => (p.bedrooms || 1) >= 4);
    else result = result.filter(p => (p.bedrooms || 1) == parseInt(b));
  }

  if (activeFilters.minRating !== null) {
    result = result.filter(p => (p.rating || 0) >= activeFilters.minRating);
  }

  if (activeFilters.facilities.length > 0) {
    result = result.filter(p => {
      const propFacilities = (p.facilities || "").split(",").map(f => f.trim());
      return activeFilters.facilities.every(f => propFacilities.includes(f));
    });
  }

  // Sort
  switch(activeFilters.sort) {
    case "price_asc": result.sort((a, b) => a.price - b.price); break;
    case "price_desc": result.sort((a, b) => b.price - a.price); break;
    case "rating_desc": result.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
    case "reviews_desc": result.sort((a, b) => (b.reviews_count || 0) - (a.reviews_count || 0)); break;
  }

  return result;
}

function renderActiveFilterTags() {
  const bar = document.getElementById("activeFiltersBar");
  bar.innerHTML = "";

  const tags = [];
  if (activeFilters.minPrice) tags.push({ label: `Min $${activeFilters.minPrice}`, key: "minPrice" });
  if (activeFilters.maxPrice) tags.push({ label: `Max $${activeFilters.maxPrice}`, key: "maxPrice" });
  if (activeFilters.bedrooms) tags.push({ label: `${activeFilters.bedrooms === "4" ? "4+" : activeFilters.bedrooms} bedrooms`, key: "bedrooms" });
  if (activeFilters.minRating) tags.push({ label: `${activeFilters.minRating}+ ⭐`, key: "minRating" });
  activeFilters.facilities.forEach(f => tags.push({ label: f, key: `facility_${f}` }));
  if (activeFilters.sort) {
    const sortLabels = { price_asc: "Price ↑", price_desc: "Price ↓", rating_desc: "Top rated", reviews_desc: "Most reviewed" };
    tags.push({ label: sortLabels[activeFilters.sort], key: "sort" });
  }

  if (!tags.length) return;

  tags.forEach(tag => {
    const el = document.createElement("div");
    el.className = "active-filter-tag";
    el.innerHTML = `${tag.label} <button onclick="removeFilter('${tag.key}')">×</button>`;
    bar.appendChild(el);
  });

  const count = document.createElement("span");
  count.className = "results-count";
  const filtered = filterAndSort(allProperties);
  count.textContent = `${filtered.length} properties`;
  bar.appendChild(count);
}

function removeFilter(key) {
  if (key.startsWith("facility_")) {
    const fac = key.replace("facility_", "");
    activeFilters.facilities = activeFilters.facilities.filter(f => f !== fac);
    document.querySelectorAll(".facility-chip").forEach(c => {
      if (c.dataset.val === fac) c.classList.remove("selected");
    });
  } else {
    activeFilters[key] = key === "facilities" ? [] : null;
    if (key === "sort") document.getElementById("sortSelect").value = "";
    if (key === "bedrooms") document.querySelectorAll(".bedroom-chip").forEach(c => c.classList.remove("selected"));
    if (key === "minRating") document.querySelectorAll(".rating-chip").forEach(c => c.classList.remove("selected"));
    if (key === "minPrice") document.getElementById("minPrice").value = "";
    if (key === "maxPrice") document.getElementById("maxPrice").value = "";
  }
  renderProperties(allProperties);
  renderActiveFilterTags();
}

function renderProperties(properties) {
  const filtered = filterAndSort(properties);
  const container = document.getElementById("propertiesContainer");
  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px;color:#888;">
        <i class="fa-regular fa-face-sad-tear" style="font-size:2.5rem;display:block;margin-bottom:12px;color:#ddd;"></i>
        <h3 style="color:#555;margin-bottom:8px;">No properties match your filters</h3>
        <p>Try adjusting or clearing your filters.</p>
        <button onclick="clearFilters()" style="margin-top:16px;padding:10px 24px;background:#2b2b2b;color:white;border:none;border-radius:20px;cursor:pointer;font-weight:600;">Clear filters</button>
      </div>`;
    return;
  }

  // Update title count
  const titleEl = document.getElementById("cityTitle");
  if (cityId) {
    titleEl.innerText = `${filtered.length} stay${filtered.length !== 1 ? "s" : ""} in ${cityId}`;
  } else {
    titleEl.innerText = `${filtered.length} properties found`;
  }

  filtered.forEach(property => {
    const card = document.createElement("div");
    card.className = "property-card";
    const rating = Number(property.rating || 0);
    const reviews = property.reviews_count || 0;

    const linkParams = new URLSearchParams({ id: property.id });
    if (checkinParam) linkParams.set("checkin", checkinParam);
    if (checkoutParam) linkParams.set("checkout", checkoutParam);
    if (guestsParam) linkParams.set("guests", guestsParam);

    card.innerHTML = `
      <div class="property-image-wrapper">
        <img src="${property.image || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994'}" />
        <button class="favorite-btn" data-id="${property.id}">
          <i class="fa-regular fa-heart"></i>
        </button>
      </div>
      <div class="property-content">
        <div class="property-title">${property.title}</div>
        <div class="property-location">${property.address}</div>
        <div class="property-price">$${property.price} / night</div>
        <div class="rating-section">
          <div class="rating-top">
            <div class="rating-circle">${rating.toFixed(1)}</div>
            <div class="rating-label">${getRatingLabel(rating)}</div>
          </div>
          <div class="review-count">${reviews} reviews</div>
        </div>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.closest(".favorite-btn")) return;
      window.location.href = `/property.html?${linkParams.toString()}`;
    });

    container.appendChild(card);
  });

  initFavoriteButtons();
}

async function loadProperties() {
  let url = "/api/properties";
  const urlParams = [];
  if (cityId) urlParams.push(`city=${encodeURIComponent(cityId)}`);
  if (checkinParam) urlParams.push(`checkin=${checkinParam}`);
  if (checkoutParam) urlParams.push(`checkout=${checkoutParam}`);
  if (urlParams.length > 0) url += "?" + urlParams.join("&");

  const res = await fetch(url);
  allProperties = await res.json();

  if (allProperties.length > 0) {
    document.getElementById("cityTitle").innerText = `Stays in ${cityId || allProperties[0].city}`;
  } else {
    document.getElementById("cityTitle").innerText = `No properties found`;
  }

  renderProperties(allProperties);
}

loadProperties();