const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 3000;
const SECRET = process.env.SECRET || "supersecret";

// ===== MOCK DB =====
let users = [];
let messages = [];
let onlineUsers = {};

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

// ===== AI =====
app.post("/ai", (req, res) => {
  res.json({
    reply: "AI: " + req.body.message
  });
});

// ===== DELETE ACCOUNT =====
app.delete("/delete-account", (req, res) => {
  const username = req.headers.username;

  users = users.filter(u => u.username !== username);
  res.send("Deleted");
});

// ===== SOCKET =====
io.on("connection", (socket) => {

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

  // ===== CALLS =====
  socket.on("call-user", ({ to, offer }) => {
    io.to(onlineUsers[to]).emit("incoming-call", {
      from: socket.id,
      offer
    });
  });

  socket.on("answer-call", ({ to, answer }) => {
    io.to(to).emit("call-answered", { answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", candidate);
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
