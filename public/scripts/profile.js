const token = localStorage.getItem("token");

document.addEventListener("DOMContentLoaded", () => {
  loadProfile();

  const avatarInput = document.getElementById("avatarInput");
  const avatarImg = document.getElementById("profileAvatar");

  if (avatarInput) {
    avatarInput.addEventListener("change", async function () {
      const file = this.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("avatar", file);
      try {
        const res = await fetch("/api/upload/avatar", {
          method: "POST",
          headers: { Authorization: "Bearer " + token },
          body: formData
        });
        const data = await res.json();
        if (data.avatar_url) {
          avatarImg.src = data.avatar_url;
          const navAvatar = document.getElementById("navAvatar");
          if (navAvatar) navAvatar.src = data.avatar_url;
        }
      } catch (err) { console.error("Avatar upload error:", err); }
    });
  }

  document.querySelectorAll(".profile-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".profile-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".profile-section").forEach(s => s.classList.remove("active-section"));
      const section = btn.dataset.section;
      if (section === "about") document.getElementById("aboutSection").classList.add("active-section");
      if (section === "wishlist") document.getElementById("wishlistSection").classList.add("active-section");
      if (section === "trips") document.getElementById("tripsSection").classList.add("active-section");
    });
  });
});

async function loadProfile() {

  // --- User info ---
  try {
    const res = await fetch("/api/users/me", { headers: { Authorization: "Bearer " + token } });
    if (!res.ok) throw new Error();
    const user = await res.json();

    const profileAvatar = document.getElementById("profileAvatar");
    if (profileAvatar) profileAvatar.src = user.avatar || "https://www.gravatar.com/avatar/?d=mp";
    const navAvatar = document.getElementById("navAvatar");
    if (navAvatar) navAvatar.src = user.avatar || "https://www.gravatar.com/avatar/?d=mp";
    const profileName = document.getElementById("profileName");
    if (profileName) profileName.textContent = user.name || "No name";
    const profileLocation = document.getElementById("profileLocation");
    if (profileLocation) profileLocation.textContent = user.location || "No location added";
    const userDescription = document.getElementById("userDescription");
    if (userDescription) userDescription.textContent = user.description || "No description yet.";
  } catch (err) { console.error("User load error:", err); }

  // --- Edit Description ---
  const editDescriptionBtn = document.getElementById("editDescriptionBtn");
  const saveDescriptionBtn = document.getElementById("saveDescriptionBtn");
  const descriptionInput = document.getElementById("descriptionInput");
  const userDescription = document.getElementById("userDescription");

  editDescriptionBtn.addEventListener("click", () => {
    const current = userDescription.textContent;
    descriptionInput.value = current === "No description yet." ? "" : current;
    document.getElementById("descriptionEditWrapper").style.display = "block";
    editDescriptionBtn.style.display = "none";
    userDescription.style.display = "none";
  });

  saveDescriptionBtn.addEventListener("click", async () => {
    const description = descriptionInput.value.trim();
    const locationText = document.getElementById("profileLocation").textContent;
    const location = locationText === "No location added" ? "" : locationText;
    const res = await fetch("/api/users/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ description, location })
    });
    if (res.ok) {
      userDescription.textContent = description || "No description yet.";
      userDescription.style.display = "block";
      document.getElementById("descriptionEditWrapper").style.display = "none";
      editDescriptionBtn.style.display = "inline";
    }
  });

  // --- Edit Location ---
  const editLocationBtn = document.getElementById("editLocationBtn");
  const saveLocationBtn = document.getElementById("saveLocationBtn");
  const locationInput = document.getElementById("locationInput");
  const profileLocation = document.getElementById("profileLocation");

  editLocationBtn.addEventListener("click", () => {
    const current = profileLocation.textContent;
    locationInput.value = current === "No location added" ? "" : current;
    document.getElementById("locationEditWrapper").style.display = "block";
    editLocationBtn.style.display = "none";
  });

  saveLocationBtn.addEventListener("click", async () => {
    const location = locationInput.value.trim();
    const descText = document.getElementById("userDescription").textContent;
    const description = descText === "No description yet." ? "" : descText;
    const res = await fetch("/api/users/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ description, location })
    });
    if (res.ok) {
      profileLocation.textContent = location || "No location added";
      document.getElementById("locationEditWrapper").style.display = "none";
      editLocationBtn.style.display = "inline";
    }
  });

  // --- Reviews ---
  try {
    const reviewsRes = await fetch("/api/reviews/me", { headers: { Authorization: "Bearer " + token } });
    const reviews = await reviewsRes.json();
    const reviewsContainer = document.getElementById("userReviews");
    if (reviewsContainer && Array.isArray(reviews)) {
      if (reviews.length === 0) {
        reviewsContainer.innerHTML = "<p style='color:#888;font-size:14px;'>No reviews yet.</p>";
      } else {
        const REVIEWS_PER_PAGE = 4;
        let reviewPage = 1;
        const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);

        function renderReviewsPage(page) {
          reviewPage = page;
          const slice = reviews.slice((page-1)*REVIEWS_PER_PAGE, page*REVIEWS_PER_PAGE);

          let html = slice.map(r => `
            <div class="review-card" onclick="window.location.href='/property.html?id=${r.property_id}'" style="background:#f9f9f9;border-radius:14px;padding:16px;margin-bottom:12px;cursor:pointer;transition:box-shadow 0.2s;" onmouseenter="this.style.boxShadow='0 4px 16px rgba(0,0,0,0.10)'" onmouseleave="this.style.boxShadow='none'">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="font-weight:600;font-size:15px;">${r.property_title || "Property"}</div>
                <div style="color:#f5a623;font-size:14px;">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</div>
              </div>
              <p style="color:#444;font-size:14px;margin:0;line-height:1.6;">${r.comment}</p>
              <div style="color:#aaa;font-size:12px;margin-top:8px;">${new Date(r.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</div>
            </div>
          `).join("");

          if (totalPages > 1) {
            html += `<div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
              <button id="revPrev" ${page===1?"disabled":""} style="padding:6px 14px;border-radius:20px;border:1.5px solid #ddd;background:white;font-size:13px;font-weight:600;cursor:${page===1?"default":"pointer"};color:${page===1?"#ccc":"#333"};">← Prev</button>
              ${Array.from({length:totalPages},(_,i)=>`<button class="rev-page-btn" data-p="${i+1}" style="width:32px;height:32px;border-radius:50%;border:1.5px solid ${i+1===page?"#6b705c":"#ddd"};background:${i+1===page?"#6b705c":"white"};color:${i+1===page?"white":"#333"};font-size:13px;font-weight:600;cursor:pointer;">${i+1}</button>`).join("")}
              <button id="revNext" ${page===totalPages?"disabled":""} style="padding:6px 14px;border-radius:20px;border:1.5px solid #ddd;background:white;font-size:13px;font-weight:600;cursor:${page===totalPages?"default":"pointer"};color:${page===totalPages?"#ccc":"#333"};">Next →</button>
            </div>`;
          }

          reviewsContainer.innerHTML = html;

          if (totalPages > 1) {
            document.getElementById("revPrev")?.addEventListener("click", () => { if(reviewPage>1) renderReviewsPage(reviewPage-1); });
            document.getElementById("revNext")?.addEventListener("click", () => { if(reviewPage<totalPages) renderReviewsPage(reviewPage+1); });
            reviewsContainer.querySelectorAll(".rev-page-btn").forEach(btn => {
              btn.addEventListener("click", () => renderReviewsPage(parseInt(btn.dataset.p)));
            });
          }
        }

        renderReviewsPage(1);
      }
    }
  } catch (err) { console.error("Reviews load error:", err); }

  // --- Wishlist ---
  try {
    const wishlistRes = await fetch("/api/wishlist", { headers: { Authorization: "Bearer " + token } });
    const wishlist = await wishlistRes.json();
    const wishlistContainer = document.getElementById("wishlistContainer");

    if (wishlistContainer && Array.isArray(wishlist)) {
      if (wishlist.length === 0) {
        wishlistContainer.innerHTML = "<p style='color:#888;font-size:14px;'>No favorites yet.</p>";
      } else {
        const WISHLIST_PER_PAGE = 12;
        let wishlistPage = 1;
        const totalWishlistPages = Math.ceil(wishlist.length / WISHLIST_PER_PAGE);

        function renderWishlistPage(page) {
          wishlistPage = page;
          const slice = wishlist.slice((page-1)*WISHLIST_PER_PAGE, page*WISHLIST_PER_PAGE);

          wishlistContainer.innerHTML = "";

          const grid = document.createElement("div");
          grid.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:20px;";
          wishlistContainer.appendChild(grid);

          slice.forEach(w => {
            const card = document.createElement("div");
            card.className = "property-card";
            card.style.cssText = "background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;";
            card.innerHTML = `
              <div class="property-image-wrapper" style="position:relative;height:180px;overflow:hidden;">
                <img src="${w.image || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994'}" style="width:100%;height:100%;object-fit:cover;" />
                <button class="favorite-btn active" data-id="${w.id}" style="position:absolute;top:10px;right:10px;background:white;border:none;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15);"><i class="fa-solid fa-heart" style="color:#e31c5f;"></i></button>
              </div>
              <div class="property-content" style="padding:14px;">
                <div class="property-title" style="font-weight:600;font-size:15px;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${w.title}</div>
                <div class="property-location" style="color:#888;font-size:13px;margin-bottom:6px;">${w.address}</div>
                <div class="property-price" style="font-weight:700;font-size:14px;margin-bottom:8px;">$${w.price} / night</div>
                <div class="rating-section" style="display:flex;justify-content:space-between;align-items:center;">
                  <div class="rating-top" style="display:flex;align-items:center;gap:6px;">
                    <div class="rating-circle" style="width:28px;height:28px;background:#6b705c;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:white;">${Number(w.rating || 0).toFixed(1)}</div>
                    <div class="rating-label" style="font-size:13px;color:#555;">Great</div>
                  </div>
                  <div class="review-count" style="font-size:12px;color:#aaa;">${w.reviews_count || 0} reviews</div>
                </div>
              </div>
            `;

            card.addEventListener("mouseenter", () => {
              card.style.transform = "translateY(-4px)";
              card.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
            });
            card.addEventListener("mouseleave", () => {
              card.style.transform = "translateY(0)";
              card.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
            });

            card.querySelector(".favorite-btn").addEventListener("click", async (e) => {
              e.stopPropagation();
              await fetch(`/api/wishlist/${e.currentTarget.dataset.id}`, {
                method: "DELETE", headers: { Authorization: "Bearer " + token }
              });
              const idx = wishlist.findIndex(x => x.id == e.currentTarget.dataset.id);
              if (idx !== -1) wishlist.splice(idx, 1);
              renderWishlistPage(wishlistPage > Math.ceil(wishlist.length / WISHLIST_PER_PAGE) ? wishlistPage - 1 : wishlistPage);
            });

            card.addEventListener("click", (e) => {
              if (e.target.closest(".favorite-btn")) return;
              window.location.href = `/property.html?id=${w.id}`;
            });

            grid.appendChild(card);
          });

          if (totalWishlistPages > 1) {
            const pagination = document.createElement("div");
            pagination.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:20px;flex-wrap:wrap;";
            const totalPages = Math.ceil(wishlist.length / WISHLIST_PER_PAGE);

            pagination.innerHTML = `
              <button id="wlPrev" ${page===1?"disabled":""} style="padding:6px 14px;border-radius:20px;border:1.5px solid #ddd;background:white;font-size:13px;font-weight:600;cursor:${page===1?"default":"pointer"};color:${page===1?"#ccc":"#333"};">← Prev</button>
              ${Array.from({length:totalPages},(_,i)=>`<button class="wl-page-btn" data-p="${i+1}" style="width:32px;height:32px;border-radius:50%;border:1.5px solid ${i+1===page?"#6b705c":"#ddd"};background:${i+1===page?"#6b705c":"white"};color:${i+1===page?"white":"#333"};font-size:13px;font-weight:600;cursor:pointer;">${i+1}</button>`).join("")}
              <button id="wlNext" ${page===totalPages?"disabled":""} style="padding:6px 14px;border-radius:20px;border:1.5px solid #ddd;background:white;font-size:13px;font-weight:600;cursor:${page===totalPages?"default":"pointer"};color:${page===totalPages?"#ccc":"#333"};">Next →</button>
            `;

            wishlistContainer.appendChild(pagination);

            document.getElementById("wlPrev")?.addEventListener("click", () => { if(wishlistPage>1) renderWishlistPage(wishlistPage-1); });
            document.getElementById("wlNext")?.addEventListener("click", () => { if(wishlistPage<totalPages) renderWishlistPage(wishlistPage+1); });
            wishlistContainer.querySelectorAll(".wl-page-btn").forEach(btn => {
              btn.addEventListener("click", () => renderWishlistPage(parseInt(btn.dataset.p)));
            });
          }
        }

        renderWishlistPage(1);
      }
    }
  } catch (err) { console.error("Wishlist load error:", err); }

  // --- Travel History ---
  try {
    const historyRes = await fetch("/api/reservations/my", { headers: { Authorization: "Bearer " + token } });
    const history = await historyRes.json();
    const historyContainer = document.getElementById("travelHistory");

    if (historyContainer && Array.isArray(history)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcoming  = history.filter(h => new Date(h.check_out + "T00:00:00") >= today && h.status !== "cancelled");
      const completed = history.filter(h => new Date(h.check_out + "T00:00:00") < today  || h.status === "cancelled");

      function renderTrip(h) {
        const checkIn = new Date(h.check_in + "T00:00:00");
        const daysUntil = Math.ceil((checkIn - today) / (1000 * 60 * 60 * 24));

        let refundInfo = "";
        if (h.status === "confirmed" && h.payment_status === "paid") {
          if (daysUntil >= 5)
            refundInfo = `<div style="font-size:12px;color:#2e7d32;margin-top:4px;">✅ Free cancellation — full refund</div>`;
          else if (daysUntil >= 2)
            refundInfo = `<div style="font-size:12px;color:#e65100;margin-top:4px;">⚠️ 50% refund if cancelled now</div>`;
          else if (daysUntil > 0)
            refundInfo = `<div style="font-size:12px;color:#c62828;margin-top:4px;">❌ Non-refundable at this point</div>`;
        }

        if (h.status === "cancelled" && h.refund_amount > 0)
          refundInfo = `<div style="font-size:12px;color:#2e7d32;margin-top:4px;">💰 Refunded: $${h.refund_amount}</div>`;
        else if (h.status === "cancelled" && h.payment_status === "paid")
          refundInfo = `<div style="font-size:12px;color:#c62828;margin-top:4px;">No refund issued</div>`;

        const card = document.createElement("div");
        card.style.cssText = "display:flex;gap:16px;background:white;border-radius:16px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,0.07);margin-bottom:16px;align-items:center;cursor:pointer;transition:box-shadow 0.2s;";
        card.innerHTML = `
          <img src="${h.image || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994'}"
            style="width:100px;height:80px;object-fit:cover;border-radius:12px;flex-shrink:0;">
          <div style="flex:1;">
            <div style="font-weight:600;font-size:16px;margin-bottom:4px;">${h.property_title}</div>
            <div style="color:#888;font-size:14px;margin-bottom:4px;">${h.address}, ${h.city}</div>
            <div style="color:#444;font-size:14px;">
              ${new Date(h.check_in + "T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
              →
              ${new Date(h.check_out + "T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
            </div>
            <div style="margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;
                background:${h.status==='confirmed'?'#e6f4ea':h.status==='cancelled'?'#fdecea':'#fff3e0'};
                color:${h.status==='confirmed'?'#2e7d32':h.status==='cancelled'?'#c62828':'#e65100'};">
                ${h.status}
              </span>
              ${h.payment_status === 'paid' ? '<span style="padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;background:#e8f0fe;color:#1a56db;">💳 Paid</span>' : ''}
            </div>
            ${refundInfo}
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
            <div style="font-weight:700;font-size:16px;">$${h.total_price}</div>
            ${h.status === 'confirmed' ? `<button class="cancel-btn" data-id="${h.id}" style="padding:8px 16px;background:white;border:1px solid #ddd;border-radius:20px;cursor:pointer;font-size:13px;color:#e31c5f;">Cancel</button>` : ''}
          </div>
        `;

        card.addEventListener("mouseenter", () => card.style.boxShadow = "0 4px 16px rgba(0,0,0,0.12)");
        card.addEventListener("mouseleave", () => card.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)");
        card.addEventListener("click", (e) => {
          if (e.target.closest(".cancel-btn")) return;
          window.location.href = `/property.html?id=${h.property_id}`;
        });

        const cancelBtn = card.querySelector(".cancel-btn");
        if (cancelBtn) cancelBtn.addEventListener("click", () => cancelReservation(h, card));
        return card;
      }

      historyContainer.innerHTML = "";

      const TRIPS_PER_PAGE = 4;

      function renderTripSection(title, trips, containerId) {
        const section = document.createElement("div");
        section.id = containerId;

        const titleEl = document.createElement("h3");
        titleEl.textContent = title;
        titleEl.style.cssText = "font-size:18px;font-weight:700;margin-bottom:16px;margin-top:8px;";
        section.appendChild(titleEl);

        if (trips.length === 0) {
          const el = document.createElement("p");
          el.style.color = "#888";
          el.textContent = title === "Upcoming Trips" ? "No upcoming trips." : "No completed trips yet.";
          section.appendChild(el);
          historyContainer.appendChild(section);
          return;
        }

        let page = 1;
        const totalPages = Math.ceil(trips.length / TRIPS_PER_PAGE);

        const cardsWrapper = document.createElement("div");
        section.appendChild(cardsWrapper);

        const paginationEl = document.createElement("div");
        paginationEl.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:8px;margin-bottom:16px;flex-wrap:wrap;";
        section.appendChild(paginationEl);

        function renderPage(p) {
          page = p;
          cardsWrapper.innerHTML = "";
          const slice = trips.slice((p-1)*TRIPS_PER_PAGE, p*TRIPS_PER_PAGE);
          slice.forEach(h => cardsWrapper.appendChild(renderTrip(h)));

          paginationEl.innerHTML = "";
          if (totalPages <= 1) return;

          paginationEl.innerHTML = `
            <button onclick="this.closest('div').dispatchEvent(new CustomEvent('goto',{detail:${p-1},bubbles:true}))"
              ${p===1?"disabled":""} style="padding:6px 14px;border-radius:20px;border:1.5px solid #ddd;background:white;font-size:13px;font-weight:600;cursor:${p===1?"default":"pointer"};color:${p===1?"#ccc":"#333"};">← Prev</button>
            ${Array.from({length:totalPages},(_,i)=>`
              <button onclick="this.closest('div').dispatchEvent(new CustomEvent('goto',{detail:${i+1},bubbles:true}))"
                style="width:32px;height:32px;border-radius:50%;border:1.5px solid ${i+1===p?"#6b705c":"#ddd"};background:${i+1===p?"#6b705c":"white"};color:${i+1===p?"white":"#333"};font-size:13px;font-weight:600;cursor:pointer;">${i+1}</button>
            `).join("")}
            <button onclick="this.closest('div').dispatchEvent(new CustomEvent('goto',{detail:${p+1},bubbles:true}))"
              ${p===totalPages?"disabled":""} style="padding:6px 14px;border-radius:20px;border:1.5px solid #ddd;background:white;font-size:13px;font-weight:600;cursor:${p===totalPages?"default":"pointer"};color:${p===totalPages?"#ccc":"#333"};">Next →</button>
          `;
          paginationEl.addEventListener("goto", e => renderPage(e.detail), {once:true});
        }

        paginationEl.addEventListener("goto", e => renderPage(e.detail));
        renderPage(1);
        historyContainer.appendChild(section);
      }

      renderTripSection("Upcoming Trips", upcoming, "upcomingTrips");
      renderTripSection("Completed Trips", completed, "completedTrips");
    }
  } catch (err) { console.error("History load error:", err); }
}

async function cancelReservation(reservation, card) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkIn = new Date(reservation.check_in + "T00:00:00");
  const daysUntil = Math.ceil((checkIn - today) / (1000 * 60 * 60 * 24));

  let confirmMsg = "Are you sure you want to cancel this reservation?";
  if (reservation.payment_status === "paid") {
    if (daysUntil >= 5)
      confirmMsg += `\n\n✅ You will receive a FULL refund of $${reservation.total_price}.`;
    else if (daysUntil >= 2)
      confirmMsg += `\n\n⚠️ You will receive a 50% refund of $${Math.round(reservation.total_price * 0.5)}.`;
    else
      confirmMsg += `\n\n❌ This reservation is non-refundable.`;
  }

  if (!confirm(confirmMsg)) return;

  const res = await fetch(`/api/reservations/${reservation.id}/cancel`, {
    method: "PUT",
    headers: { Authorization: "Bearer " + token }
  });

  const data = await res.json();

  if (res.ok) {
    const statusBadge = card.querySelector("span[style]");
    if (statusBadge) {
      statusBadge.textContent = "cancelled";
      statusBadge.style.background = "#fdecea";
      statusBadge.style.color = "#c62828";
    }

    const infoDiv = card.querySelectorAll("div")[2];
    const existingRefund = infoDiv.querySelector(".refund-info");
    if (existingRefund) existingRefund.remove();

    const refundDiv = document.createElement("div");
    refundDiv.className = "refund-info";
    refundDiv.style.cssText = "font-size:12px;margin-top:4px;";
    if (data.refund_amount > 0) {
      refundDiv.style.color = "#2e7d32";
      refundDiv.textContent = `💰 Refund of $${data.refund_amount} will be processed in 5-10 business days.`;
    } else {
      refundDiv.style.color = "#c62828";
      refundDiv.textContent = "No refund issued.";
    }
    infoDiv.appendChild(refundDiv);

    const cancelBtn = card.querySelector(".cancel-btn");
    if (cancelBtn) cancelBtn.remove();
  }
}