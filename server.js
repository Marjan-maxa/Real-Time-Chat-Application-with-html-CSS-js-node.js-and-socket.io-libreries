const express = require("express");
const app = express();
const http = require("http").createServer(app);
const PORT = process.env.PORT || 4000;

const io = require("socket.io")(http);

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("message", (msg) => {
    socket.broadcast.emit("message", msg);
  });

  socket.on("typing", (user) => {
    socket.broadcast.emit("typing", user);
  });

  // ✅ Voice Message
  socket.on("voice", (msg) => {
    console.log("Voice received");
    socket.broadcast.emit("voice", msg);
  });
});

http.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
