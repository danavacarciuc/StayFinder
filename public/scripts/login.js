document.getElementById("loginForm").addEventListener("submit", async function (e) {

  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {

    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Login failed");
      return;
    }
    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    alert("Login successful!");

    window.location.href = "index.html";

  } catch (error) {
    console.error("Login error:", error);
    alert("Server error. Try again.");
  }

});