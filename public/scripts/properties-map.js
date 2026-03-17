async function loadProperties() {
  const token = localStorage.getItem("token");

  const res = await fetch("/api/properties");
  const properties = await res.json();

  const map = L.map('map').setView([48.8566, 2.3522], 5);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const container = document.getElementById("propertiesContainer");
  container.innerHTML = "";

  properties.forEach(property => {

    if (property.lat && property.lng && !isNaN(property.lat) && !isNaN(property.lng)) {
      const priceMarker = L.divIcon({
        className: "custom-price-marker",
        html: `<div class="price-bubble">$${property.price}</div>`,
        iconSize: [100, 40],
        iconAnchor: [50, 20]
      });

      const marker = L.marker(
        [Number(property.lat), Number(property.lng)],
        { icon: priceMarker }
      ).addTo(map);

      marker.on("click", () => {
        window.location.href = `/property.html?id=${property.id}`;
      });
    }

    const card = document.createElement("div");
    card.className = "property-card";
    const rating = property.rating || 8.8;
    const reviews = property.reviews || 125;

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
            <div class="rating-label">Great</div>
          </div>
          <div class="review-count">${reviews} reviews</div>
        </div>
      </div>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.closest(".favorite-btn")) return;
      window.location.href = `/property.html?id=${property.id}`;
    });

    container.appendChild(card);
  });

  await initFavoriteButtons();
}

loadProperties();