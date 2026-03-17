const token = localStorage.getItem("token");
const form = document.getElementById("hostPropertyForm");
const container = document.getElementById("hostPropertiesList");

async function loadProperties() {
  try {
    const res = await fetch("/api/properties/host?t=" + Date.now(), {
      headers: { Authorization: "Bearer " + token }
    });
    const properties = await res.json();
    container.innerHTML = "";

    if (!Array.isArray(properties) || properties.length === 0) {
      container.innerHTML = "<p>No properties yet.</p>";
      return;
    }

    const sorted = [...properties].sort((a, b) => b.id - a.id);

    for (const p of sorted) {
      const imgRes = await fetch(`/api/properties/${p.id}/images?t=` + Date.now());
      const images = await imgRes.json();
      const firstImage = images[0]?.image_path || "https://images.unsplash.com/photo-1568605114967-8130f3a36994";

      const card = document.createElement("div");
      card.className = "host-property-card";
      card.id = `property-${p.id}`;
      card.innerHTML = `
        <img src="${firstImage}" style="width:100%;height:180px;object-fit:cover;border-radius:12px;margin-bottom:12px;">
        <h4>${p.title}</h4>
        <p>${p.city}, ${p.country}</p>
        <p>$${p.price} / night</p>
        <div style="display:flex;gap:10px;margin-top:12px;">
          <button onclick="deleteProperty(${p.id})">Delete</button>
          <button onclick="editProperty(${p.id})">Edit</button>
        </div>
      `;
      container.appendChild(card);
    }
  } catch (err) {
    console.error("Load error:", err);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  try {
    const res = await fetch("/api/properties", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: formData
    });

    const data = await res.json();
    console.log("Create response:", data);

    if (data.success) {
      form.reset();
      closeModal();
      loadProperties();
    } else {
      alert("Error: " + (data.error || "Unknown error"));
    }
  } catch (err) {
    console.error("Submit error:", err);
  }
});

async function deleteProperty(id) {
  if (!confirm("Are you sure you want to delete this property?")) return;

  await fetch("/api/properties/" + id, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + token }
  });
  loadProperties();
}

function editProperty(id) {
  window.location.href = `/edit-property.html?id=${id}`;
}

loadProperties();


async function loadHostReservations() {
  const token = localStorage.getItem("token");

  const res = await fetch("/api/reservations/host", {
    headers: { Authorization: "Bearer " + token }
  });

  const reservations = await res.json();
  const container = document.getElementById("hostReservationsList");
  if (!container) return;

  if (reservations.length === 0) {
    container.innerHTML = "<p style='color:#888'>No reservations yet.</p>";
    return;
  }

  reservations.forEach(r => {
    const card = document.createElement("div");
    card.style.cssText = "display:flex;gap:16px;background:white;border-radius:16px;padding:16px;box-shadow:0 2px 12px rgba(0,0,0,0.07);margin-bottom:16px;align-items:center;";
    card.innerHTML = `
      <img src="${r.image || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994'}"
        style="width:100px;height:80px;object-fit:cover;border-radius:12px;flex-shrink:0;">
      <div style="flex:1;">
        <div style="font-weight:600;font-size:16px;margin-bottom:4px;">${r.property_title}</div>
        <div style="color:#888;font-size:14px;margin-bottom:4px;">
          Guest: <strong>${r.guest_name}</strong> (${r.guest_email})
        </div>
        <div style="color:#444;font-size:14px;">
          ${new Date(r.check_in).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"})}
          →
          ${new Date(r.check_out).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric"})}
        </div>
        <div style="margin-top:4px;">
          <span style="
            display:inline-block;
            padding:3px 10px;
            border-radius:20px;
            font-size:12px;
            font-weight:600;
            background:${r.status === 'confirmed' ? '#e6f4ea' : r.status === 'cancelled' ? '#fdecea' : '#fff3e0'};
            color:${r.status === 'confirmed' ? '#2e7d32' : r.status === 'cancelled' ? '#c62828' : '#e65100'};
          ">${r.status}</span>
        </div>
      </div>
      <div style="font-weight:700;font-size:16px;">$${r.total_price}</div>
    `;
    container.appendChild(card);
  });
}

loadHostReservations();