async function loadFavorites() {
  const token = localStorage.getItem("token");
  if (!token) return [];

  try {
    const res = await fetch("/api/wishlist", {
      headers: { Authorization: "Bearer " + token }
    });
    const wishlist = await res.json();
    return wishlist.map(w => String(w.id));
  } catch {
    return [];
  }
}

async function initFavoriteButtons() {
  const token = localStorage.getItem("token");
  const favorites = await loadFavorites();

  document.querySelectorAll(".favorite-btn").forEach(btn => {
    const propertyId = String(btn.dataset.id);

    if (favorites.includes(propertyId)) {
      btn.classList.add("active");
      const icon = btn.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-regular");
        icon.classList.add("fa-solid");
        icon.style.color = "#e31c5f";
      }
    }

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();

      if (!token) {
        window.location.href = "/login.html";
        return;
      }

      const isActive = btn.classList.contains("active");

      if (!isActive) {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
          },
          body: JSON.stringify({ property_id: propertyId })
        });
        btn.classList.add("active");
        const icon = btn.querySelector("i");
        if (icon) {
          icon.classList.remove("fa-regular");
          icon.classList.add("fa-solid");
          icon.style.color = "#e31c5f";
        }
      } else {
        await fetch(`/api/wishlist/${propertyId}`, {
          method: "DELETE",
          headers: { Authorization: "Bearer " + token }
        });
        btn.classList.remove("active");
        const icon = btn.querySelector("i");
        if (icon) {
          icon.classList.remove("fa-solid");
          icon.classList.add("fa-regular");
          icon.style.color = "";
        }
      }
    });
  });
}