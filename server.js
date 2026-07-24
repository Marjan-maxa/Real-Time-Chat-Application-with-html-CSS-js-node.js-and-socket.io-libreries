const express = require("express");
const app = express();
const http = require("http").createServer(app);
const PORT = process.env.PORT || 4000;

const io = require("socket.io")(http);
const multer = require("multer");
const path = require("path");

app.use(express.static(__dirname + "/public"));

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".pdf") {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
      }
    },
  }),
);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

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

  socket.on("image", (msg) => {
    socket.broadcast.emit("image", msg);
  });

  socket.on("file", (msg) => {
    socket.broadcast.emit("file", msg);
  });
});

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({
    file: "/uploads/" + req.file.filename,
    fileName: req.file.originalname,
  });
});

http.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
