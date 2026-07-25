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
  console.log("✅ User Connected:", socket.id);

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

  socket.on("call-user", (data) => {
    console.log("📞 Call request from:", data);

    socket.broadcast.emit("incoming-call", {
      caller: data.caller,
    });
  });
  // Accept Call
  socket.on("accept-call", () => {
    socket.broadcast.emit("call-accepted");
  });

  // Reject Call
  socket.on("reject-call", () => {
    socket.broadcast.emit("call-rejected");
  });

  // End Call
  socket.on("end-call", () => {
    socket.broadcast.emit("call-ended");
  });
  socket.on("offer", (offer) => {
    console.log("📤 Offer forwarding");

    socket.broadcast.emit("offer", offer);
  });

  socket.on("answer", (answer) => {
    console.log("📥 Answer forwarding");

    socket.broadcast.emit("answer", answer);
  });

  socket.on("ice-candidate", (candidate) => {
    socket.broadcast.emit("ice-candidate", candidate);
  });

  socket.on("disconnect", () => {
    console.log("❌ User Disconnected:", socket.id);
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
