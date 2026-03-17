const loginBtn = document.getElementById("loginBtn");
const loginModal = document.getElementById("loginModal");
const closeModal = document.getElementById("closeModal");
const loginForm = document.getElementById("loginForm");
const authArea = document.getElementById("authArea");

loginBtn.addEventListener("click", () => {
  loginModal.classList.remove("hidden");
});

closeModal.addEventListener("click", () => {
  loginModal.classList.add("hidden");
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("token", data.token);
    loginModal.classList.add("hidden");
    loadUser();
  } else {
    alert(data.message);
  }
});

function loadUser() {
  const token = localStorage.getItem("token");

  if (token) {
    authArea.innerHTML = `
      <span>Hi 👋</span>
      <button onclick="logout()" class="nav-btn">Logout</button>
    `;
  }
}

function logout() {
  localStorage.removeItem("token");
  location.reload();
}

loadUser();