const express = require("express");
const app = express();
const http = require("http").createServer(app);
const PORT = process.env.PORT || 4000;

const io = require("socket.io")(http);
const users = {};

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

  // Register User
  socket.on("register-user", (username) => {
    users[username] = socket.id;

    console.log(username + " Registered");

    io.emit("user-list", Object.keys(users));
  });
  socket.on("message", (data) => {
    console.log(data);
    const targetSocket = users[data.to];

    if (targetSocket) {
      io.to(targetSocket).emit("message", data);
    }
  });

  socket.on("typing", (data) => {
    const targetSocket = users[data.to];

    if (targetSocket) {
      io.to(targetSocket).emit("typing", {
        user: data.user,
      });
    }
  });

  // ✅ Voice Message
  socket.on("voice", (data) => {
    const targetSocket = users[data.to];

    if (targetSocket) {
      io.to(targetSocket).emit("voice", data);
    }
  });

  socket.on("image", (data) => {
    const targetSocket = users[data.to];

    if (targetSocket) {
      io.to(targetSocket).emit("image", data);
    }
  });

  socket.on("file", (data) => {
    const targetSocket = users[data.to];

    if (targetSocket) {
      io.to(targetSocket).emit("file", data);
    }
  });

  socket.on("call-user", (data) => {
    const targetSocket = users[data.to];

    if (targetSocket) {
      io.to(targetSocket).emit("incoming-call", {
        caller: data.caller,
        type: data.type,
      });
    }
  });
  // Accept Call
  socket.on("accept-call", (data) => {
    const targetSocket = users[data.to];

    if (targetSocket) {
      io.to(targetSocket).emit("call-accepted");
    }
  });

  // Reject Call
  socket.on("reject-call", (data) => {
    const targetSocket = users[data.to];

    if (targetSocket) {
      io.to(targetSocket).emit("call-rejected");
    }
  });

  // End Call
  socket.on("end-call", (data) => {
    const targetSocket = users[data.to];

    if (targetSocket) {
      io.to(targetSocket).emit("call-ended");
    }
  });
  socket.on("offer", (data) => {
    const targetSocket = users[data.to];

    if (targetSocket) {
      io.to(targetSocket).emit("offer", {
        offer: data.offer,
        from: data.user,
      });
    }
  });

  socket.on("answer", (data) => {
    const targetSocket = users[data.to];

    if (targetSocket) {
      io.to(targetSocket).emit("answer", {
        answer: data.answer,
      });
    }
  });

  socket.on("ice-candidate", (data) => {
    const targetSocket = users[data.to];

    if (targetSocket) {
      io.to(targetSocket).emit("ice-candidate", data);
    }
  });
  socket.on("disconnect", () => {
    console.log("❌ User Disconnected:", socket.id);

    for (const username in users) {
      if (users[username] === socket.id) {
        delete users[username];

        break;
      }
    }

    io.emit("user-list", Object.keys(users));
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
