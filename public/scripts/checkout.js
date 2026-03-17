const token = localStorage.getItem("token");
const params = new URLSearchParams(window.location.search);

const propertyId = params.get("property_id");
const checkin    = params.get("checkin");
const checkout   = params.get("checkout");
const guests     = params.get("guests");
const total      = parseFloat(params.get("total") || 0);

// Dacă nu e logat, redirect la login
if (!token) {
  window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.href)}`;
}

// --- Populează summary ---
document.addEventListener("DOMContentLoaded", async () => {
  const nights = Math.round((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));

  // Încarcă detalii proprietate (inclusiv cleaning_fee real)
  let cleaningFee = 0;
  try {
    const res = await fetch(`/api/properties/${propertyId}`);
    const p = await res.json();
    document.getElementById("summaryTitle").textContent = p.title;
    document.getElementById("summaryCity").textContent = `${p.city}, ${p.country}`;
    cleaningFee = p.cleaning_fee || 0;

    const imgRes = await fetch(`/api/properties/${propertyId}/images`);
    const images = await imgRes.json();
    if (images[0]) document.getElementById("summaryImage").src = images[0].image_path;
  } catch(e) {}

  const serviceFee  = Math.round(total * 0.12);
  const grandTotal  = total + cleaningFee + serviceFee;

  document.getElementById("payBtnAmount").textContent = `$${grandTotal}`;
  document.getElementById("summaryTotal").textContent = `$${grandTotal}`;
  document.getElementById("summaryNightsLabel").textContent = `$${Math.round(total / nights)} x ${nights} night${nights !== 1 ? "s" : ""}`;
  document.getElementById("summaryNightsPrice").textContent = `$${total}`;
  document.getElementById("summaryCleaningFee").textContent = cleaningFee > 0 ? `$${cleaningFee}` : "–";
  document.getElementById("summaryServiceFee").textContent = `$${serviceFee}`;

  // Format card number cu spații
  const cardInput = document.getElementById("cardNumber");
  cardInput.addEventListener("input", () => {
    let val = cardInput.value.replace(/\D/g, "").substring(0, 16);
    cardInput.value = val.match(/.{1,4}/g)?.join(" ") || val;
  });

  // Format expiry
  const expiryInput = document.getElementById("cardExpiry");
  expiryInput.addEventListener("input", () => {
    let val = expiryInput.value.replace(/\D/g, "").substring(0, 4);
    if (val.length >= 3) val = val.substring(0, 2) + " / " + val.substring(2);
    expiryInput.value = val;
  });

  // CVV — doar cifre
  const cvvInput = document.getElementById("cardCvv");
  cvvInput.addEventListener("input", () => {
    cvvInput.value = cvvInput.value.replace(/\D/g, "").substring(0, 3);
  });

  // Pay button
  document.getElementById("payBtn").addEventListener("click", handlePayment);
});

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m)-1]} ${parseInt(d)}, ${y}`;
}

function showError(msg) {
  document.getElementById("alertErrorMsg").textContent = msg;
  const el = document.getElementById("alertError");
  el.classList.add("show");
  document.getElementById("alertSuccess").classList.remove("show");
  setTimeout(() => el.classList.remove("show"), 5000);
}

function validateCard() {
  const number = document.getElementById("cardNumber").value.replace(/\s/g, "");
  const name   = document.getElementById("cardName").value.trim();
  const expiry = document.getElementById("cardExpiry").value.replace(/\s/g, "");
  const cvv    = document.getElementById("cardCvv").value.trim();

  if (number.length !== 16) { showError("Please enter a valid 16-digit card number."); return false; }
  if (!name) { showError("Please enter the cardholder name."); return false; }
  if (expiry.length < 4) { showError("Please enter a valid expiry date."); return false; }

  // Verifică data expirare
  const month = parseInt(expiry.substring(0, 2));
  const year  = parseInt("20" + expiry.replace("/","").substring(2, 4));
  const now   = new Date();
  if (month < 1 || month > 12 || year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
    showError("Your card has expired. Please use a different card.");
    return false;
  }

  if (cvv.length !== 3) { showError("Please enter a valid 3-digit CVV."); return false; }

  return { number, name, expiry, cvv };
}

async function handlePayment() {
  const card = validateCard();
  if (!card) return;

  const btn = document.getElementById("payBtn");
  const spinner = document.getElementById("paySpinner");
  const btnText = document.getElementById("payBtnText");

  // Loading state
  btn.disabled = true;
  spinner.style.display = "block";
  btnText.style.display = "none";

  // Simulare delay procesare plată
  await new Promise(r => setTimeout(r, 2000));

  // Verifică dacă cardul e cel de "declined"
  const DECLINED_CARD = "4000000000000002";
  if (card.number === DECLINED_CARD) {
    btn.disabled = false;
    spinner.style.display = "none";
    btnText.style.display = "inline";
    showError("Your card was declined. Please try a different payment method.");
    // Shake animație pe card input
    const cardInput = document.getElementById("cardNumber");
    cardInput.classList.add("error");
    setTimeout(() => cardInput.classList.remove("error"), 3000);
    return;
  }

  // Orice alt card invalid (nu 4242...) — eșuat
  const SUCCESS_CARD = "4242424242424242";
  if (card.number !== SUCCESS_CARD) {
    btn.disabled = false;
    spinner.style.display = "none";
    btnText.style.display = "inline";
    showError("We could not process your payment. Please check your card details and try again.");
    document.getElementById("cardNumber").classList.add("error");
    setTimeout(() => document.getElementById("cardNumber").classList.remove("error"), 3000);
    return;
  }

  // ✅ Plată reușită — creează rezervarea
  try {
    const propRes = await fetch(`/api/properties/${propertyId}`);
    const propData = await propRes.json();
    const cleaningFee = propData.cleaning_fee || 0;
    const serviceFee  = Math.round(total * 0.12);
    const grandTotal  = total + cleaningFee + serviceFee;

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        property_id: propertyId,
        check_in: checkin,
        check_out: checkout,
        guests,
        payment_status: "paid",
        total_price: grandTotal
      })
    });

    const data = await res.json();

    if (!res.ok) {
      btn.disabled = false;
      spinner.style.display = "none";
      btnText.style.display = "inline";
      showError(data.error || "Reservation failed. Please try again.");
      return;
    }

    // Succes
    document.getElementById("alertSuccess").classList.add("show");
    setTimeout(() => {
      window.location.href = `/booking-confirm.html?total=${grandTotal}&checkin=${checkin}&checkout=${checkout}&reservation_id=${data.reservation_id}`;
    }, 1500);

  } catch(err) {
    btn.disabled = false;
    spinner.style.display = "none";
    btnText.style.display = "inline";
    showError("Something went wrong. Please try again.");
  }
}