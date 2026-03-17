/* =====================================================
   INITIAL SETUP
===================================================== */

const navInner = document.getElementById("navInner");
const navInnerSearch = document.getElementById("navInnerSearch");
const navContainer = document.getElementById("navModeContainer");
const navButtons = document.querySelector(".nav-buttons");
const token = localStorage.getItem("token");


/* =====================================================
   AUTH NAVIGATION (LOGIN / LOGOUT / HOST MODE)
===================================================== */

if (token) {

  /* ---------- Hide Login / Register ---------- */

  if (navButtons) {
    const loginBtn = navButtons.querySelector('a[href="login.html"]');
    const registerBtn = navButtons.querySelector('a[href="register.html"]');

    if (loginBtn) loginBtn.remove();
    if (registerBtn) registerBtn.remove();

    navButtons.insertAdjacentHTML("beforeend", `
      <button class="nav-mode-btn" id="logoutBtn">Logout</button>
    `);

    document.getElementById("logoutBtn")
      .addEventListener("click", () => {
        localStorage.removeItem("token");
        window.location.href = "/index.html";
      });
  }


  /* ---------- Host / Guest Mode ---------- */

  if (navContainer) {
    try {

      const payload = JSON.parse(atob(token.split(".")[1]));
      const isHost = payload.is_host === 1;
      const isDashboard = window.location.pathname.includes("dashboard");

      // USER NU ESTE HOST
      if (!isHost) {

        navContainer.innerHTML = `
          <button class="btn-outline" id="becomeHostBtn">
            Become a Host
          </button>
        `;

        document.getElementById("becomeHostBtn")
          .addEventListener("click", async () => {

            const res = await fetch("/api/auth/become-host", {
              method: "POST",
              headers: {
                Authorization: "Bearer " + token
              }
            });

            const data = await res.json();

            if (!res.ok) {
              alert("Error becoming host");
              return;
            }

            localStorage.setItem("token", data.token);
            window.location.href = "/dashboard.html";
          });
      }

      // USER ESTE HOST
      else {

        // Dacă este în dashboard → Guest Mode
        if (isDashboard) {

          navContainer.innerHTML = `
            <button class="btn-outline" id="guestModeBtn">
              Guest Mode
            </button>
          `;

          document.getElementById("guestModeBtn")
            .addEventListener("click", () => {
              window.location.href = "/index.html";
            });
        }

        // Dacă NU este în dashboard → Host Mode
        else {

          navContainer.innerHTML = `
            <button class="btn-outline" id="hostModeBtn">
              Host Mode
            </button>
          `;

          document.getElementById("hostModeBtn")
            .addEventListener("click", () => {
              window.location.href = "/dashboard.html";
            });
        }
      }

    } catch (err) {
      console.error("Token decode error:", err);
    }
  }
}


/* =====================================================
   UI EFFECTS
===================================================== */

/* Scroll shrink */
if (navInner) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      navInner.classList.remove("nav-inner-default");
      navInner.classList.add("nav-inner-compact");
    } else {
      navInner.classList.remove("nav-inner-compact");
      navInner.classList.add("nav-inner-default");
    }
  });
}


/* Expand search */
if (navInnerSearch) {

  navInnerSearch.addEventListener("click", () => {
    if (!navInnerSearch.classList.contains("nav-inner-search--expanded")) {
      navInnerSearch.classList.remove("nav-inner-search--collapsed");
      navInnerSearch.classList.add("nav-inner-search--expanded");
    }
  });

  /* Collapse on outside click */
  document.addEventListener("click", (e) => {
    if (!navInnerSearch.contains(e.target)) {
      navInnerSearch.classList.remove("nav-inner-search--expanded");
      navInnerSearch.classList.add("nav-inner-search--collapsed");
    }
  });
}