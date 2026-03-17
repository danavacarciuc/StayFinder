const navToken = localStorage.getItem("token");
const navButtons = document.querySelector(".nav-buttons") || document.querySelector(".inner-nav-actions");

if (navToken && navButtons) {
  try {
    const loginBtn = navButtons.querySelector('a[href="login.html"]') || navButtons.querySelector('a[href="/login.html"]');
    const registerBtn = navButtons.querySelector('a[href="/register.html"]') || navButtons.querySelector('a[href="register.html"]');
    if (loginBtn) loginBtn.remove();
    if (registerBtn) registerBtn.remove();

    const isInnerNav = navButtons.classList.contains("inner-nav-actions");
    const btnClass = isInnerNav ? "inner-nav-btn" : "btn-outline";

    const isOnDashboard = window.location.pathname.includes("dashboard");
    const hostBtnLabel = isOnDashboard ? "Be a Guest" : "Become a Host";
    const hostBtnLink = isOnDashboard ? "/index.html" : "/dashboard.html";

    navButtons.insertAdjacentHTML("beforeend", `
      <a href="${hostBtnLink}" class="${btnClass}">${hostBtnLabel}</a>
      <div class="nav-user-wrapper">
        <img src="https://www.gravatar.com/avatar/?d=mp" class="nav-avatar" id="navAvatar" style="cursor:pointer;">
        <div class="hamburger" id="navHamburger">☰</div>
        <div class="dropdown-menu" id="navDropdown">
          <a href="/messages.html" id="messagesLink" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:#222;font-size:14px;font-weight:500;">
            <i class="fa-regular fa-comment-dots" style="width:16px;color:#444;"></i> Messages
            <span id="unreadBadge" style="
              display:none;
              background:#e31c5f;
              color:white;
              border-radius:50%;
              width:18px;
              height:18px;
              font-size:10px;
              font-weight:700;
              align-items:center;
              justify-content:center;
              margin-left:auto;
            "></span>
          </a>
          <a href="/settings.html" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:#222;font-size:14px;font-weight:500;">
            <i class="fa-solid fa-gear" style="width:16px;color:#444;"></i> Settings
          </a>
          <button id="logoutBtn" style="display:flex;align-items:center;gap:10px;font-size:14px;font-weight:500;color:#222;border:none;background:none;padding:10px 20px;cursor:pointer;width:100%;text-align:left;">
            <i class="fa-solid fa-right-from-bracket" style="width:16px;color:#444;"></i> Logout
          </button>
        </div>
      </div>
    `);

    fetch("/api/users/me", {
      headers: { Authorization: "Bearer " + navToken }
    })
    .then(res => res.json())
    .then(user => {
      const avatar = document.getElementById("navAvatar");
      if (avatar && user.avatar) avatar.src = user.avatar;

      // Buton Admin doar pentru email-ul specific
      if (user.email === "vacarciucdana23@stud.ase.ro") {
        const adminBtn = document.createElement("a");
        adminBtn.href = "/admin.html";
        adminBtn.textContent = "Admin";
        adminBtn.style.cssText = `
          background: #c62828;
          color: white;
          padding: 8px 18px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 13px;
          text-decoration: none;
          margin-right: 6px;
        `;
        const wrapper = navButtons.querySelector(".nav-user-wrapper");
        navButtons.insertBefore(adminBtn, wrapper);
      }
    })
    .catch(() => {});

    // Încarcă unread badge
    fetch("/api/messages/unread/count", {
      headers: { Authorization: "Bearer " + navToken }
    })
    .then(res => res.json())
    .then(data => {
      if (data.count > 0) {
        const badge = document.getElementById("unreadBadge");
        if (badge) {
          badge.textContent = data.count;
          badge.style.display = "inline-flex";
        }
      }
    })
    .catch(() => {});

    document.getElementById("navAvatar").addEventListener("click", () => {
      window.location.href = "/profile.html";
    });

    document.getElementById("navHamburger").addEventListener("click", () => {
      document.getElementById("navDropdown").classList.toggle("show");
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
      localStorage.removeItem("token");
      window.location.href = "/index.html";
    });

  } catch (err) {
    console.error("Invalid token");
  }
}