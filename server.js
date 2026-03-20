const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();

// 🔥 ВАЖНО для Railway
app.set("trust proxy", 1);

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

app.use(express.json());

const server = http.createServer(app);

// 🔥 правильный Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"]
});

const PORT = process.env.PORT || 3000;
const SECRET = process.env.SECRET || "supersecret";

// ===== DB =====
let users = [];
let messages = [];
let onlineUsers = {};

// ===== TEST ROUTE =====
app.get("/", (req, res) => {
  res.send("Napishime backend running ✅");
});

// ===== AUTH =====
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (users.find(u => u.username === username)) {
    return res.status(400).send("User exists");
  }

  const hash = await bcrypt.hash(password, 10);
  users.push({ username, password: hash });

  res.send("OK");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);
  if (!user) return res.status(400).send("No user");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).send("Wrong pass");

  const token = jwt.sign({ username }, SECRET);
  res.json({ token });
});

// ===== MESSAGES =====
app.get("/messages/:user", (req, res) => {
  const me = req.headers.username;
  const other = req.params.user;

  const chat = messages.filter(
    m =>
      (m.from === me && m.to === other) ||
      (m.from === other && m.to === me)
  );

  res.json(chat);
});

// ===== SOCKET =====
io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  socket.on("login", (username) => {
    onlineUsers[username] = socket.id;
    io.emit("online", Object.keys(onlineUsers));
  });

  socket.on("send", ({ from, to, content }) => {
    messages.push({ from, to, content });

    if (onlineUsers[to]) {
      io.to(onlineUsers[to]).emit("message", {
        from,
        content
      });
    }
  });

  socket.on("disconnect", () => {
    for (let user in onlineUsers) {
      if (onlineUsers[user] === socket.id) {
        delete onlineUsers[user];
      }
    }
    io.emit("online", Object.keys(onlineUsers));
  });

});

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
