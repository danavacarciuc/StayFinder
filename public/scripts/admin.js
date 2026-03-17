const form = document.getElementById("propertyForm");
const citySelect = document.getElementById("citySelect");

async function loadCities() {
  const res = await fetch("http://localhost:5000/api/cities");
  const cities = await res.json();

  cities.forEach(city => {
    const option = document.createElement("option");
    option.value = city.id;
    option.textContent = city.name;
    citySelect.appendChild(option);
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData(form);

  const res = await fetch("http://localhost:5000/api/upload/property", {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (data.success) {
    alert("Property added!");
    form.reset();
  }
});

loadCities();