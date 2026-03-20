const BACKEND_URL = https:"//backend-napishime-uufv.vercel.app";

let socket;
let username = prompt("Enter username");
let currentChat = "";
let onlineUsers = [];

// 🔥 фикс подключения
socket = io(BACKEND_URL, {
  transports: ["websocket"]
});

socket.on("connect", () => {
  console.log("CONNECTED ✅");
});

socket.emit("login", username);

socket.on("online", (users) => {
  onlineUsers = users;
  renderUsers();
});

socket.on("message", (msg) => {
  if (msg.from === currentChat) {
    addMessage(msg.content, false);
  }
});

function renderUsers() {
  users.innerHTML = "";

  onlineUsers.forEach(user => {
    if (user === username) return;

    users.innerHTML += `
      <div onclick="openChat('${user}')"
        class="p-2 cursor-pointer hover:bg-gray-800">
        ${user}
      </div>
    `;
  });
}

async function openChat(user) {
  currentChat = user;
  chatWith.innerText = user;
  messages.innerHTML = "";

  const res = await fetch(
    BACKEND_URL + "/messages/" + user,
    {
      headers: { username }
    }
  );

  const data = await res.json();

  data.forEach(m => {
    addMessage(m.content, m.from === username);
  });
}

function send() {
  const text = msg.value;
  if (!text) return;

  socket.emit("send", {
    from: username,
    to: currentChat,
    content: text
  });

  addMessage(text, true);
  msg.value = "";
}

function addMessage(text, mine) {
  messages.innerHTML += `
    <div class="${mine ? "text-right" : "text-left"}">
      <span class="inline-block px-3 py-2 rounded
        ${mine ? "bg-blue-500" : "bg-gray-700"}">
        ${text}
      </span>
    </div>
  `;
}
app.get("/", (req, res) => {
  res.send("Napishime backend working ✅");
});
