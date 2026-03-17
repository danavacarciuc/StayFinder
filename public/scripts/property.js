const token = localStorage.getItem("token");
const params = new URLSearchParams(window.location.search);
const propertyId = params.get("id");
const checkinParam = params.get("checkin");
const checkoutParam = params.get("checkout");
const guestsParam = params.get("guests");

async function loadProperty() {
  const res = await fetch(`/api/properties/${propertyId}`);
  const p = await res.json();

  document.title = p.title + " - StayFinder";
  document.getElementById("propertyTitle").textContent = p.title;
  document.getElementById("propertyLocation").textContent = p.city + ", " + p.country;
  document.getElementById("propertySubtitle").textContent = p.title;
  document.getElementById("propertySpecs").textContent = `${p.bedrooms} bedrooms · ${p.bathrooms} bathrooms · ${p.max_guests} guests`;
  document.getElementById("propertyDescription").textContent = p.description || "";
  document.getElementById("bookingPrice").textContent = "$" + p.price;
  document.getElementById("stickyPrice").textContent = "$" + p.price + " / night";

  const today = new Date().toISOString().split("T")[0];
  const checkinEl = document.getElementById("checkin");
  const checkoutEl = document.getElementById("checkout");
  const guestsEl = document.getElementById("guests");

  checkinEl.min = today;
  checkoutEl.min = today;

  // Pre-completează datele din URL
  if (checkinParam) checkinEl.value = checkinParam;
  if (checkoutParam) checkoutEl.value = checkoutParam;
  if (guestsParam) guestsEl.value = guestsParam;

  // imagini
  const imgRes = await fetch(`/api/properties/${propertyId}/images`);
  const images = await imgRes.json();
  const defaultImg = "https://images.unsplash.com/photo-1568605114967-8130f3a36994";

  const slots = ["mainImage", "img2", "img3", "img4", "img5"];
  slots.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (images[i]) {
      el.style.backgroundImage = `url(${images[i].image_path})`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.display = "";
    } else if (i === 0) {
      el.style.backgroundImage = `url(${defaultImg})`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
    } else {
      el.style.display = "none";
    }
  });

  // facilities
  const facilitiesList = document.getElementById("facilitiesList");
  const facilityIcons = {
    "WiFi": "fa-wifi", "Pool": "fa-water-ladder", "Parking": "fa-square-parking",
    "Air Conditioning": "fa-snowflake", "Kitchen": "fa-utensils",
    "Washing Machine": "fa-jug-detergent", "TV": "fa-tv",
    "Self Check-in": "fa-key", "Hair Dryer": "fa-wind",
    "Dryer": "fa-shirt", "Grill": "fa-fire"
  };

  if (p.facilities) {
    p.facilities.split(",").forEach(f => {
      const icon = facilityIcons[f.trim()] || "fa-check";
      facilitiesList.innerHTML += `
        <div style="display:flex;align-items:center;gap:12px;font-size:15px;">
          <i class="fa-solid ${icon}" style="width:20px;color:#444;"></i>
          <span>${f.trim()}</span>
        </div>
      `;
    });
  }

  // map
  if (p.lat && p.lng) {
    const map = L.map("propertyMap").setView([p.lat, p.lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
    L.marker([p.lat, p.lng]).addTo(map);
  }

  // price breakdown
  function updateBreakdown() {
    if (!checkinEl.value || !checkoutEl.value) return;
    const nights = Math.round((new Date(checkoutEl.value) - new Date(checkinEl.value)) / (1000 * 60 * 60 * 24));
    if (nights <= 0) return;
    const total = nights * p.price;
    document.getElementById("priceBreakdown").innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span>$${p.price} x ${nights} nights</span>
        <span>$${total}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid #eee;padding-top:12px;margin-top:8px;">
        <span>Total</span>
        <span>$${total}</span>
      </div>
    `;
  }

  checkinEl.addEventListener("change", updateBreakdown);
  checkoutEl.addEventListener("change", updateBreakdown);

  // Dacă datele sunt deja completate din URL, calculează imediat breakdown-ul
  if (checkinParam && checkoutParam) updateBreakdown();

  // host check + message button
  try {
    const meRes = await fetch("/api/users/me", { headers: { Authorization: "Bearer " + token } });
    const me = await meRes.json();
    if (me.id && me.id == p.host_id) {
      document.getElementById("bookBtn").disabled = true;
      document.getElementById("bookBtn").textContent = "You own this property";
      document.getElementById("bookBtn").style.background = "#ccc";
      document.getElementById("bookBtn").style.cursor = "not-allowed";
    } else if (me.id) {
      // Adaugă buton Message Host
      const msgBtn = document.createElement("button");
      msgBtn.textContent = "Message Host";
      msgBtn.style.cssText = `
        width:100%;
        padding:12px;
        background:white;
        color:#222;
        border:1.5px solid #ddd;
        border-radius:12px;
        font-size:15px;
        font-weight:600;
        cursor:pointer;
        margin-top:8px;
        transition: border-color 0.2s;
      `;
      msgBtn.addEventListener("mouseenter", () => msgBtn.style.borderColor = "#222");
      msgBtn.addEventListener("mouseleave", () => msgBtn.style.borderColor = "#ddd");
      msgBtn.addEventListener("click", async () => {
        msgBtn.textContent = "Opening chat...";
        msgBtn.disabled = true;
        const res = await fetch("/api/messages/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({ host_id: p.host_id, property_id: propertyId })
        });
        const data = await res.json();
        if (data.conversation_id) {
          window.location.href = `/messages.html?conversation_id=${data.conversation_id}`;
        }
      });
      document.getElementById("bookBtn").parentNode.insertBefore(msgBtn, document.getElementById("bookBtn").nextSibling);
    }
  } catch (e) {}

  await loadReviews();
  initReviewForm();
  loadSimilarProperties();
}

// sticky bar
window.addEventListener("scroll", () => {
  const stickyBar = document.getElementById("stickyBar");
  if (window.scrollY > 400) {
    stickyBar.style.display = "flex";
  } else {
    stickyBar.style.display = "none";
  }
});

// rezervare
document.getElementById("bookBtn").addEventListener("click", () => {
  const checkin = document.getElementById("checkin").value;
  const checkout = document.getElementById("checkout").value;
  const guests = document.getElementById("guests").value;

  if (!token) {
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
    return;
  }

  if (!checkin || !checkout) {
    alert("Please select check-in and check-out dates.");
    return;
  }

  if (new Date(checkout) <= new Date(checkin)) {
    alert("Check-out must be after check-in.");
    return;
  }

  const nights = Math.round((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
  const pricePerNight = parseFloat(document.getElementById("bookingPrice").textContent.replace("$", ""));
  const total = nights * pricePerNight;

  window.location.href = `/checkout.html?property_id=${propertyId}&checkin=${checkin}&checkout=${checkout}&guests=${guests}&total=${total}`;
});

async function loadReviews() {
  const res = await fetch(`/api/reviews/property/${propertyId}`);
  const reviews = await res.json();
  const list = document.getElementById("reviewsList");
  const avg = document.getElementById("reviewsAverage");

  if (!Array.isArray(reviews) || reviews.length === 0) {
    list.innerHTML = "<p style='color:#888;font-size:14px;'>No reviews yet.</p>";
    avg.textContent = "";
  } else {
    const mean = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
    avg.innerHTML = `⭐ <strong>${mean}</strong> · ${reviews.length} review${reviews.length > 1 ? "s" : ""}`;

    const PER_PAGE = 4;
    let currentPage = 1;
    const totalPages = Math.ceil(reviews.length / PER_PAGE);

    function renderPage(page) {
      const start = (page - 1) * PER_PAGE;
      const slice = reviews.slice(start, start + PER_PAGE);

      const reviewsHtml = slice.map(r => `
        <div style="display:flex;gap:14px;margin-bottom:24px;">
          <img src="${r.guest_avatar || 'https://www.gravatar.com/avatar/?d=mp'}"
            style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0;">
          <div>
            <div style="font-weight:600;font-size:15px;margin-bottom:2px;">${r.guest_name}</div>
            <div style="color:#888;font-size:13px;margin-bottom:6px;">
              ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} ·
              ${new Date(r.created_at).toLocaleDateString("en-GB", {month:"long", year:"numeric"})}
            </div>
            <div style="color:#444;font-size:14px;line-height:1.6;">${r.comment}</div>
          </div>
        </div>
      `).join("");

      // Paginare buttons
      let paginationHtml = "";
      if (totalPages > 1) {
        paginationHtml = `<div style="display:flex;align-items:center;gap:8px;margin-top:8px;margin-bottom:16px;">`;

        // Prev
        paginationHtml += `<button onclick="changePage(${page - 1})" ${page === 1 ? "disabled" : ""} style="
          padding:6px 14px;border-radius:20px;border:1.5px solid #ddd;background:white;
          font-size:13px;font-weight:600;cursor:${page === 1 ? "default" : "pointer"};
          color:${page === 1 ? "#ccc" : "#333"};transition:all 0.2s;">← Prev</button>`;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
          paginationHtml += `<button onclick="changePage(${i})" style="
            width:32px;height:32px;border-radius:50%;border:1.5px solid ${i === page ? "#6b705c" : "#ddd"};
            background:${i === page ? "#6b705c" : "white"};color:${i === page ? "white" : "#333"};
            font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;">${i}</button>`;
        }

        // Next
        paginationHtml += `<button onclick="changePage(${page + 1})" ${page === totalPages ? "disabled" : ""} style="
          padding:6px 14px;border-radius:20px;border:1.5px solid #ddd;background:white;
          font-size:13px;font-weight:600;cursor:${page === totalPages ? "default" : "pointer"};
          color:${page === totalPages ? "#ccc" : "#333"};transition:all 0.2s;">Next →</button>`;

        paginationHtml += `<span style="font-size:13px;color:#888;margin-left:4px;">${page} / ${totalPages}</span></div>`;
      }

      list.innerHTML = reviewsHtml + paginationHtml;
    }

    window.changePage = function(page) {
      if (page < 1 || page > totalPages) return;
      currentPage = page;
      renderPage(currentPage);
      document.getElementById("reviews").scrollIntoView({ behavior: "smooth", block: "start" });
    };

    renderPage(currentPage);
  }

  if (!token) return;

  const eligRes = await fetch("/api/reservations/my", {
    headers: { Authorization: "Bearer " + token }
  });
  const reservations = await eligRes.json();
  const today = new Date();

  const eligible = Array.isArray(reservations) && reservations.some(r =>
    r.property_id == propertyId &&
    r.status === "confirmed" &&
    new Date(r.check_out + "T00:00:00") < today
  );

  if (eligible) {
    document.getElementById("reviewFormWrapper").style.display = "block";
  } else {
    const notEl = document.getElementById("reviewNotEligible");
    notEl.style.display = "block";
    notEl.textContent = "You can leave a review after your stay is complete.";
  }
}

function initReviewForm() {
  const stars = document.querySelectorAll("#starRating span");

  stars.forEach(star => {
    star.addEventListener("mouseover", () => {
      const val = parseInt(star.dataset.value);
      stars.forEach(s => s.style.color = parseInt(s.dataset.value) <= val ? "#f5a623" : "#ddd");
    });
    star.addEventListener("mouseout", () => {
      const current = parseInt(document.getElementById("reviewRating").value);
      stars.forEach(s => s.style.color = parseInt(s.dataset.value) <= current ? "#f5a623" : "#ddd");
    });
    star.addEventListener("click", () => {
      const val = parseInt(star.dataset.value);
      document.getElementById("reviewRating").value = val;
      stars.forEach(s => s.style.color = parseInt(s.dataset.value) <= val ? "#f5a623" : "#ddd");
    });
  });

  document.getElementById("submitReviewBtn").addEventListener("click", async () => {
    const rating = parseInt(document.getElementById("reviewRating").value);
    const comment = document.getElementById("reviewComment").value.trim();
    const msg = document.getElementById("reviewMsg");

    if (!rating) return msg.innerHTML = "<span style='color:red;'>Please select a rating.</span>";
    if (!comment) return msg.innerHTML = "<span style='color:red;'>Please write a comment.</span>";

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({ property_id: propertyId, rating, comment })
    });

    const data = await res.json();

    if (res.ok) {
      msg.innerHTML = "<span style='color:green;'>Review submitted!</span>";
      document.getElementById("reviewFormWrapper").style.display = "none";
      loadReviews();
    } else {
      msg.innerHTML = `<span style='color:red;'>${data.error}</span>`;
    }
  });
}

loadProperty();

async function loadSimilarProperties() {
  try {
    const res = await fetch(`/api/analytics/similar/${propertyId}`);
    const data = await res.json();

    if (!data.similar || !data.similar.length) return;

    const section = document.getElementById("similarSection");
    const container = document.getElementById("similarContainer");
    const subtitle = document.getElementById("similarSubtitle");

    subtitle.textContent = `Properties similar to this one in ${data.targetCity}, ranked by similarity score`;
    section.style.display = "block";

    const params = new URLSearchParams(window.location.search);
    const checkin = params.get("checkin") || "";
    const checkout = params.get("checkout") || "";
    const guests = params.get("guests") || "";

    data.similar.forEach(p => {
      const rating = Number(p.rating || 0);
      const linkParams = new URLSearchParams({ id: p.id });
      if (checkin) linkParams.set("checkin", checkin);
      if (checkout) linkParams.set("checkout", checkout);
      if (guests) linkParams.set("guests", guests);

      const card = document.createElement("div");
      card.style.cssText = "background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);cursor:pointer;transition:transform 0.2s;";
      card.onmouseenter = () => card.style.transform = "translateY(-4px)";
      card.onmouseleave = () => card.style.transform = "translateY(0)";

      card.innerHTML = `
        <div style="position:relative;height:140px;overflow:hidden;">
          <img src="${p.image || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994'}"
            style="width:100%;height:100%;object-fit:cover;">
          <div style="position:absolute;top:10px;right:10px;background:white;border-radius:20px;padding:3px 10px;font-size:12px;font-weight:700;color:#6b705c;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
            ${p.similarity}% match
          </div>
        </div>
        <div style="padding:12px;">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.title}</div>
          <div style="color:#888;font-size:13px;margin-bottom:6px;">${p.city}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-weight:700;font-size:14px;">$${p.price}<span style="font-weight:400;color:#888;font-size:12px;"> / night</span></div>
            <div style="display:flex;align-items:center;gap:4px;">
              <div style="width:26px;height:26px;background:#a3a380;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;">${rating.toFixed(1)}</div>
            </div>
          </div>
        </div>
      `;

      card.addEventListener("click", () => {
        window.location.href = `/property.html?${linkParams.toString()}`;
      });

      container.appendChild(card);
    });
  } catch(e) {
    console.error("Similar properties error:", e);
  }
}