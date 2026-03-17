(function() {

let conversationHistory = [];
let isOpen = false;
let isLoading = false;
let hasGreeted = false;

// ── KNOWLEDGE BASE ────────────────────────────────────────────────────────────
const KB = [
  {
    keywords: ["cancel", "anula", "cancellation", "anulare"],
    answer: `**How to cancel a reservation:**\n\n• Go to **Profile → Previous Trips**\n• Find your reservation and click **Cancel**\n• Confirm the cancellation\n\n**Refund policy:**\n• 5+ days before check-in → full refund 💚\n• 2–4 days before check-in → 50% refund 🟡\n• Less than 2 days → no refund ❌\n\nRefunds are processed in **5–10 business days**.\n\nIs there anything else I can help you with?`,
    quickReplies: ["How do refunds work?", "Message a host", "Contact support"]
  },
  {
    keywords: ["refund", "money back", "ramburs", "bani inapoi", "money"],
    answer: `**Refund policy on StayFinder:**\n\n• **5+ days** before check-in → 100% refund\n• **2–4 days** before check-in → 50% refund\n• **Under 2 days** → no refund\n\nRefunds are **automatic** when you cancel and arrive in your account within **5–10 business days**.\n\nYou can check your refund status in **Profile → Previous Trips**.\n\nAnything else you need help with?`,
    quickReplies: ["How to cancel?", "Payment methods", "Message a host"]
  },
  {
    keywords: ["message", "host", "contact", "chat", "mesaj", "gazda"],
    answer: `**How to message a host:**\n\n• Open the **property page**\n• Scroll to the booking form\n• Click the **"Message Host"** button below the booking panel\n• This opens a direct chat in your **Messages** section\n\nYou can also access all conversations from the **Messages** link in the top navigation menu.\n\nAnything else I can help you with?`,
    quickReplies: ["Leave a review", "Cancel booking", "My profile"]
  },
  {
    keywords: ["review", "rating", "recenzie", "nota", "stars", "stele", "leave", "write"],
    answer: `**How to leave a review:**\n\n• Reviews can only be left **after a completed stay**\n• Go to the **property page** after your checkout date\n• Scroll down to the Reviews section\n• The review form will appear automatically ✅\n\n**Rating scale:**\n• ⭐⭐⭐⭐⭐ Excellent\n• ⭐⭐⭐⭐ Great\n• ⭐⭐⭐ Good\n\nNote: you can only leave one review per stay.\n\nAnything else you need?`,
    quickReplies: ["Cancel booking", "Message a host", "My profile"]
  },
  {
    keywords: ["host", "become", "list", "property", "add", "dashboard", "gazda", "proprietate", "adauga"],
    answer: `**How to become a host:**\n\n• Click **"Become a Host"** in the top navigation\n• Fill in your property details (title, description, location)\n• Set your **price per night**\n• Add **photos** and select **facilities**\n• Optionally set a cleaning fee and weekend surcharge\n• Click **Create Property** 🏠\n\nYou can manage all your properties and reservations from the **Dashboard**.\n\nAnything else?`,
    quickReplies: ["How do payments work?", "Dashboard help", "Contact support"]
  },
  {
    keywords: ["payment", "pay", "card", "plata", "platesc", "checkout", "price", "pret", "cost"],
    answer: `**Payments on StayFinder:**\n\n• We accept **secure card payments** 💳\n• Total price includes:\n  - Nightly rate × number of nights\n  - Cleaning fee (if set by host)\n  - Weekend surcharge (if applicable)\n\nYou'll see a full **price breakdown** before confirming your booking.\n\nPayments are processed securely at checkout.\n\nAnything else I can help with?`,
    quickReplies: ["How to cancel?", "Refund policy", "Become a host"]
  },
  {
    keywords: ["profile", "account", "avatar", "photo", "picture", "name", "location", "profil", "cont", "poza", "nume"],
    answer: `**How to update your profile:**\n\n• Go to your **Profile page** (click your avatar in the top right)\n• **Change photo**: click the ✎ icon on your avatar\n• **Edit description**: click ✎ Edit below your description\n• **Change location**: click the ✎ button next to your location\n• Click **Save** after each change ✅\n\nYour profile is visible to hosts when you book.\n\nAnything else?`,
    quickReplies: ["My reviews", "My wishlist", "Settings"]
  },
  {
    keywords: ["wishlist", "favorites", "favourite", "heart", "saved", "favorite", "favorite", "favorit"],
    answer: `**Favorites / Wishlist:**\n\n• Click the **❤️ heart icon** on any property card to save it\n• View all saved properties in **Profile → Favorites**\n• Click the heart again to remove it from your wishlist\n\nYou can save as many properties as you like!\n\nAnything else I can help with?`,
    quickReplies: ["How to book?", "Cancel booking", "Message a host"]
  },
  {
    keywords: ["search", "filter", "find", "cauta", "filtre", "city", "oras", "bedroom", "price", "rating"],
    answer: `**How to search & filter properties:**\n\n• Use the **search bar** on the homepage\n• Enter your **destination city**, check-in/out dates and guests\n• Click **Search** to see available properties\n\n**Filters available:**\n• Price range (min / max per night)\n• Number of bedrooms\n• Minimum rating\n• Facilities (WiFi, Pool, Parking, etc.)\n• Sort by: price, rating, or reviews\n\nAnything else?`,
    quickReplies: ["Become a host", "How to book?", "Refund policy"]
  },
  {
    keywords: ["book", "booking", "rezerv", "rezervare", "checkin", "checkout", "check-in", "check-out", "dates"],
    answer: `**How to make a booking:**\n\n• Find a property and open its page\n• Select your **check-in** and **check-out** dates\n• Choose the number of **guests**\n• Review the price breakdown\n• Click **Book Now** and complete payment 💳\n\nYou'll receive a confirmation and can view your booking in **Profile → Previous Trips**.\n\nAnything else I can help with?`,
    quickReplies: ["Cancel booking", "Refund policy", "Message a host"]
  },
  {
    keywords: ["problem", "issue", "broken", "wrong", "bug", "error", "problema", "nu merge", "help", "ajutor", "report"],
    answer: `**Having a problem?**\n\nHere's what you can do:\n\n• **Property issue** → Use the **Message Host** button on the property page to contact them directly\n• **Booking issue** → Check **Profile → Previous Trips** for your reservation status\n• **Account issue** → Go to **Settings** from the top menu\n• **Payment issue** → Refunds take 5–10 business days after cancellation\n\nIf the problem persists, you can message the host directly through the platform.\n\nIs there anything specific I can help you with?`,
    quickReplies: ["Cancel booking", "Message a host", "Refund policy"]
  },
  {
    keywords: ["hello", "hi", "hey", "buna", "salut", "help", "start", "ajutor"],
    answer: `Hi there! 👋 I'm the StayFinder support assistant.\n\nI can help you with:\n• 🚫 Cancellations & refunds\n• 💬 Messaging hosts\n• ⭐ Leaving reviews\n• 🏠 Becoming a host\n• 💳 Payments\n• 👤 Your profile & account\n\nWhat do you need help with?`,
    quickReplies: ["Cancel booking", "Refund policy", "Message a host", "Become a host"]
  }
];

const FALLBACK = `I'm not sure I understood that. Here are some things I can help you with:\n\n• 🚫 **Cancellations & refunds**\n• 💬 **Messaging a host**\n• ⭐ **Leaving a review**\n• 🏠 **Becoming a host**\n• 💳 **Payments**\n• 👤 **Profile & account**\n\nCould you rephrase your question or pick one of the topics above?`;

function getAnswer(text) {
  const lower = text.toLowerCase();
  for (const entry of KB) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return { answer: entry.answer, quickReplies: entry.quickReplies || [] };
    }
  }
  return { answer: FALLBACK, quickReplies: ["Cancel booking", "Refund policy", "Message a host", "Become a host"] };
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `
  #sf-support-btn {
    position: fixed; bottom: 28px; right: 28px; z-index: 99998;
    background: #6b705c; color: white; border: none; border-radius: 50px;
    padding: 14px 22px; font-size: 14px; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; gap: 9px;
    box-shadow: 0 6px 24px rgba(107,112,92,0.45);
    transition: transform 0.2s, box-shadow 0.2s; font-family: inherit;
  }
  #sf-support-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(107,112,92,0.55); }

  #sf-support-widget {
    position: fixed; bottom: 90px; right: 28px; z-index: 99999;
    width: 370px; max-width: calc(100vw - 40px);
    background: white; border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.18);
    display: flex; flex-direction: column; overflow: hidden;
    transform: scale(0.85) translateY(30px); opacity: 0; pointer-events: none;
    transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
    transform-origin: bottom right; max-height: 560px;
  }
  #sf-support-widget.sf-open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }

  .sf-header { background: #6b705c; padding: 16px 18px; display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  .sf-header-avatar { width:40px; height:40px; background:#a3a380; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
  .sf-header-info { flex:1; }
  .sf-header-info h4 { margin:0 0 2px 0; font-size:15px; font-weight:700; color:white; }
  .sf-header-info span { font-size:12px; color:rgba(255,255,255,0.8); display:flex; align-items:center; gap:5px; }
  .sf-online-dot { width:7px; height:7px; background:#a8e6a3; border-radius:50%; display:inline-block; flex-shrink:0; }
  .sf-close-btn { background:none; border:none; color:rgba(255,255,255,0.8); font-size:20px; cursor:pointer; padding:0; line-height:1; transition:color 0.15s; }
  .sf-close-btn:hover { color:white; }

  .sf-messages { flex:1; overflow-y:auto; padding:18px 16px; display:flex; flex-direction:column; gap:14px; background:#f8f8f5; min-height:0; }
  .sf-messages::-webkit-scrollbar { width:4px; }
  .sf-messages::-webkit-scrollbar-thumb { background:#ddd; border-radius:4px; }

  .sf-msg { display:flex; gap:8px; max-width:88%; animation:sfFadeUp 0.25s ease; }
  @keyframes sfFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  .sf-msg.sf-user { align-self:flex-end; flex-direction:row-reverse; }
  .sf-msg-avatar { width:28px; height:28px; border-radius:50%; background:#a3a380; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; color:white; }
  .sf-msg.sf-user .sf-msg-avatar { background:#6b705c; }
  .sf-msg-bubble { padding:10px 14px; border-radius:16px; font-size:13.5px; line-height:1.55; color:#222; word-break:break-word; }
  .sf-msg.sf-bot .sf-msg-bubble { background:white; border-bottom-left-radius:4px; box-shadow:0 1px 4px rgba(0,0,0,0.07); }
  .sf-msg.sf-user .sf-msg-bubble { background:#6b705c; color:white; border-bottom-right-radius:4px; }

  .sf-quick-replies { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .sf-qr-btn { padding:5px 12px; background:white; border:1.5px solid #6b705c; border-radius:20px; font-size:12px; font-weight:600; color:#6b705c; cursor:pointer; transition:all 0.15s; font-family:inherit; }
  .sf-qr-btn:hover { background:#6b705c; color:white; }

  .sf-typing { display:flex; gap:8px; align-items:center; animation:sfFadeUp 0.25s ease; }
  .sf-typing-dots { background:white; border-radius:16px; border-bottom-left-radius:4px; padding:10px 14px; display:flex; gap:4px; align-items:center; box-shadow:0 1px 4px rgba(0,0,0,0.07); }
  .sf-typing-dots span { width:6px; height:6px; background:#bbb; border-radius:50%; animation:sfBounce 1.2s infinite; }
  .sf-typing-dots span:nth-child(2) { animation-delay:0.2s; }
  .sf-typing-dots span:nth-child(3) { animation-delay:0.4s; }
  @keyframes sfBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }

  .sf-suggestions { padding:10px 14px; display:flex; flex-wrap:wrap; gap:7px; border-top:1px solid #f0f0f0; background:white; flex-shrink:0; }
  .sf-suggestion { padding:5px 12px; background:#f5f5f0; border:1.5px solid #e0e0d8; border-radius:20px; font-size:12px; font-weight:600; color:#555; cursor:pointer; transition:all 0.15s; font-family:inherit; white-space:nowrap; }
  .sf-suggestion:hover { border-color:#6b705c; color:#6b705c; background:#f0f0eb; }

  .sf-input-row { padding:12px 14px; border-top:1px solid #f0f0f0; display:flex; gap:10px; align-items:center; background:white; flex-shrink:0; }
  .sf-input { flex:1; padding:10px 16px; border:1.5px solid #e0e0e0; border-radius:30px; font-size:13px; outline:none; transition:border-color 0.2s; font-family:inherit; background:#fafafa; }
  .sf-input:focus { border-color:#6b705c; background:white; }
  .sf-send { width:38px; height:38px; background:#6b705c; border:none; border-radius:50%; color:white; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.2s; flex-shrink:0; }
  .sf-send:hover { background:#555c48; }
  .sf-send:disabled { background:#ccc; cursor:default; }
`;
document.head.appendChild(style);

// ── HTML ──────────────────────────────────────────────────────────────────────
const widget = document.createElement("div");
widget.id = "sf-support-widget";
widget.innerHTML = `
  <div class="sf-header">
    <div class="sf-header-avatar">🤖</div>
    <div class="sf-header-info">
      <h4>StayFinder Support</h4>
      <span><span class="sf-online-dot"></span> Online · replies instantly</span>
    </div>
    <button class="sf-close-btn" id="sfCloseBtn">✕</button>
  </div>
  <div class="sf-messages" id="sfMessages"></div>
  <div class="sf-suggestions" id="sfSuggestions">
    <button class="sf-suggestion" onclick="sfQuick('How do I cancel a reservation?')">🚫 Cancel booking</button>
    <button class="sf-suggestion" onclick="sfQuick('How do refunds work?')">💰 Refunds</button>
    <button class="sf-suggestion" onclick="sfQuick('How do I message a host?')">💬 Message host</button>
    <button class="sf-suggestion" onclick="sfQuick('How do I leave a review?')">⭐ Leave review</button>
    <button class="sf-suggestion" onclick="sfQuick('How do I become a host?')">🏠 Become a host</button>
    <button class="sf-suggestion" onclick="sfQuick('What payment methods do you accept?')">💳 Payments</button>
  </div>
  <div class="sf-input-row">
    <input class="sf-input" id="sfInput" placeholder="Type a message..." autocomplete="off" />
    <button class="sf-send" id="sfSendBtn">
      <i class="fa-solid fa-paper-plane"></i>
    </button>
  </div>
`;

const fab = document.createElement("button");
fab.id = "sf-support-btn";
fab.innerHTML = `<span>💬</span><span>Support</span>`;

document.body.appendChild(widget);
document.body.appendChild(fab);

const messagesEl = document.getElementById("sfMessages");
const inputEl = document.getElementById("sfInput");
const sendBtnEl = document.getElementById("sfSendBtn");
const suggestionsEl = document.getElementById("sfSuggestions");

function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '<br>• ')
    .replace(/\n/g, '<br>');
}

function appendMsg(role, text, quickReplies = []) {
  const isUser = role === "user";
  const div = document.createElement("div");
  div.className = `sf-msg ${isUser ? "sf-user" : "sf-bot"}`;
  let qrHtml = "";
  if (quickReplies.length) {
    qrHtml = `<div class="sf-quick-replies">${quickReplies.map(r =>
      `<button class="sf-qr-btn" onclick="sfQuick('${r}')">${r}</button>`
    ).join("")}</div>`;
  }
  div.innerHTML = `
    <div class="sf-msg-avatar">${isUser ? "👤" : "🤖"}</div>
    <div class="sf-msg-bubble">${formatText(text)}${qrHtml}</div>
  `;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTyping() {
  const div = document.createElement("div");
  div.className = "sf-typing";
  div.id = "sfTyping";
  div.innerHTML = `<div class="sf-msg-avatar">🤖</div><div class="sf-typing-dots"><span></span><span></span><span></span></div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTyping() { document.getElementById("sfTyping")?.remove(); }

function openWidget() {
  isOpen = true;
  widget.classList.add("sf-open");
  if (!hasGreeted) {
    hasGreeted = true;
    setTimeout(() => {
      appendMsg("bot",
        "Hi there! 👋 I'm the StayFinder support assistant.\n\nI can help you with cancellations, refunds, messaging hosts, reviews, and more.\n\nWhat can I help you with today?",
        ["Cancel reservation", "Refund policy", "Message a host"]
      );
    }, 300);
  }
  setTimeout(() => inputEl.focus(), 350);
}

function closeWidget() { isOpen = false; widget.classList.remove("sf-open"); }

fab.addEventListener("click", () => isOpen ? closeWidget() : openWidget());
document.getElementById("sfCloseBtn").addEventListener("click", closeWidget);

function sendMessage(text) {
  if (!text.trim() || isLoading) return;
  isLoading = true;
  sendBtnEl.disabled = true;
  inputEl.value = "";
  suggestionsEl.style.display = "none";

  appendMsg("user", text);
  showTyping();

  // Simulate a small delay so it feels natural
  setTimeout(() => {
    removeTyping();
    const { answer, quickReplies } = getAnswer(text);
    appendMsg("bot", answer, quickReplies);
    isLoading = false;
    sendBtnEl.disabled = false;
    inputEl.focus();
  }, 600 + Math.random() * 400);
}

window.sfQuick = function(text) {
  if (!isOpen) openWidget();
  setTimeout(() => sendMessage(text), isOpen ? 0 : 400);
};

sendBtnEl.addEventListener("click", () => sendMessage(inputEl.value.trim()));
inputEl.addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(inputEl.value.trim()); });

})();