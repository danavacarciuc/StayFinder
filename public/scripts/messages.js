const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/login.html";
}

let currentUserId = null;
let currentConversationId = null;
let pollInterval = null;

async function init() {
  const res = await fetch("/api/users/me", { headers: { Authorization: "Bearer " + token } });
  const user = await res.json();
  currentUserId = user.id;

  await loadConversations();

  // Dacă vine din property.html cu ?conversation_id=X, deschide direct
  const params = new URLSearchParams(window.location.search);
  const convId = params.get("conversation_id");
  if (convId) openConversation(parseInt(convId));
}

async function loadConversations() {
  const res = await fetch("/api/messages", { headers: { Authorization: "Bearer " + token } });
  const conversations = await res.json();

  const list = document.getElementById("conversationsList");

  if (!conversations.length) {
    list.innerHTML = `
      <div class="empty-conversations">
        <i class="fa-regular fa-comment-dots"></i>
        <p>No conversations yet</p>
      </div>
    `;
    return;
  }

  list.innerHTML = "";
  conversations.forEach(c => {
    const isGuest = c.guest_id === currentUserId;
    const otherName   = isGuest ? c.host_name  : c.guest_name;
    const otherAvatar = isGuest ? c.host_avatar : c.guest_avatar;

    const item = document.createElement("div");
    item.className = "conversation-item" + (c.id === currentConversationId ? " active" : "");
    item.dataset.id = c.id;

    item.innerHTML = `
      <img class="conversation-avatar" src="${otherAvatar || 'https://www.gravatar.com/avatar/?d=mp'}">
      <div class="conversation-info">
        <div class="conversation-name">${otherName}</div>
        ${c.property_title ? `<div class="conversation-property">📍 ${c.property_title}, ${c.property_city || ""}</div>` : ""}
        <div class="conversation-last ${c.unread_count > 0 ? 'unread' : ''}">${c.last_message || "Start a conversation"}</div>
      </div>
      ${c.unread_count > 0 ? `<div class="unread-badge">${c.unread_count}</div>` : ""}
    `;

    item.addEventListener("click", () => openConversation(c.id));
    list.appendChild(item);
  });
}

async function openConversation(conversationId) {
  currentConversationId = conversationId;

  // Mark active
  document.querySelectorAll(".conversation-item").forEach(el => {
    el.classList.toggle("active", parseInt(el.dataset.id) === conversationId);
  });

  // Găsește datele conversației
  const res = await fetch("/api/messages", { headers: { Authorization: "Bearer " + token } });
  const conversations = await res.json();
  const conv = conversations.find(c => c.id === conversationId);
  if (!conv) return;

  const isGuest = conv.guest_id === currentUserId;
  const otherName   = isGuest ? conv.host_name  : conv.guest_name;
  const otherAvatar = isGuest ? conv.host_avatar : conv.guest_avatar;

  // Construiește chat panel
  const chatPanel = document.getElementById("chatPanel");
  chatPanel.innerHTML = `
    <div class="chat-header">
      <img src="${otherAvatar || 'https://www.gravatar.com/avatar/?d=mp'}">
      <div class="chat-header-info">
        <h3>${otherName}</h3>
        <p>${isGuest ? "Host" : "Guest"}</p>
      </div>
    </div>
    ${conv.property_id ? `
      <div class="chat-property-banner" id="propertyBanner" data-id="${conv.property_id}">
        <img src="${conv.property_image || 'https://images.unsplash.com/photo-1568605114967-8130f3a36994'}" id="propBannerImg">
        <div class="chat-property-banner-info">
          <div class="prop-title">${conv.property_title}</div>
          <div class="prop-city">${conv.property_city || ""}</div>
        </div>
        <div class="view-btn">View →</div>
      </div>
    ` : ""}
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-input-area">
      <textarea id="messageInput" placeholder="Type a message..." rows="1"></textarea>
      <button class="send-btn" id="sendBtn"><i class="fa-solid fa-paper-plane"></i></button>
    </div>
  `;

  // Click pe proprietate
  const banner = document.getElementById("propertyBanner");
  if (banner) {
    banner.addEventListener("click", () => {
      window.location.href = `/property.html?id=${banner.dataset.id}`;
    });
  }

  // Auto-resize textarea
  const textarea = document.getElementById("messageInput");
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  });

  // Enter trimite (Shift+Enter = new line)
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  document.getElementById("sendBtn").addEventListener("click", sendMessage);

  await loadMessages();

  // Poll pentru mesaje noi la fiecare 3 secunde
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(loadMessages, 3000);
}

async function loadMessages() {
  if (!currentConversationId) return;

  const res = await fetch(`/api/messages/${currentConversationId}/messages`, {
    headers: { Authorization: "Bearer " + token }
  });
  const messages = await res.json();

  const container = document.getElementById("chatMessages");
  if (!container) return;

  const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

  container.innerHTML = "";

  if (messages.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:#aaa;font-size:14px;margin-top:40px;">No messages yet. Say hello! 👋</div>`;
    return;
  }

  messages.forEach(m => {
    const isSent = m.sender_id === currentUserId;
    const group = document.createElement("div");
    group.className = "message-group";

    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${isSent ? "sent" : "received"}`;
    bubble.textContent = m.content;

    const time = document.createElement("div");
    time.className = `message-time ${isSent ? "sent" : "received"}`;
    time.textContent = formatTime(m.created_at);

    group.appendChild(bubble);
    group.appendChild(time);
    container.appendChild(group);
  });

  // Scroll la bottom doar dacă era deja jos
  if (wasAtBottom) container.scrollTop = container.scrollHeight;

  // Refresh conversations list pentru unread badges
  loadConversations();
}

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const content = input.value.trim();
  if (!content) return;

  input.value = "";
  input.style.height = "auto";

  await fetch(`/api/messages/${currentConversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify({ content })
  });

  await loadMessages();
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday " + date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } else {
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " +
           date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
}

init();