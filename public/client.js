const socket = io();
const previewBox = document.getElementById("imagePreview");
const previewImg = document.getElementById("previewImg");
const cancelPreview = document.getElementById("cancelPreview");

let selectedImage = "";
let name;
const recordBtn = document.getElementById("recordBtn");
const imageBtn = document.getElementById("imageBtn");
const imageInput = document.getElementById("imageInput");

const fileBtn = document.getElementById("fileBtn");
const fileInput = document.getElementById("fileInput");

let mediaRecorder;
let audioChunks = [];
let textarea = document.querySelector("#textarea");
const sendBtn = document.querySelector("#sendBtn");
let messageArea = document.querySelector(".message_area");
do {
  name = prompt("Enter your name:");
} while (!name);
document.querySelector("#userName").textContent = name;
function sendMessage(message) {
  if (!message.trim()) return;

  let msg = {
    user: name,
    message: message.trim(),
    time: getCurrentTime(),
  };

  appendMessage(msg, "outgoing");
  textarea.value = "";
  scrollToBottom();

  socket.emit("message", msg);
}
function appendMessage(msg, type) {
  let mainDiv = document.createElement("div");
  let className = type;
  mainDiv.classList.add(className, "message");
  let markup = `
    <h4>${msg.user}</h4>
    <p>${msg.message}</p>
    <span class="time">${msg.time}</span>
  `;
  mainDiv.innerHTML = markup;
  document.querySelector(".message_area").appendChild(mainDiv);
}

function appendVoice(msg, type) {
  let div = document.createElement("div");

  div.classList.add(type, "message");

  div.innerHTML = `
        <h4>${msg.user}</h4>

        <audio controls>
            <source src="${msg.audio}" type="audio/webm">
        </audio>

        <span class="time">${msg.time}</span>
    `;

  messageArea.appendChild(div);

  scrollToBottom();
}

function appendImage(msg, type) {
  let div = document.createElement("div");

  div.classList.add(type, "message");

  div.innerHTML = `
        <h4>${msg.user}</h4>

        <img src="${msg.image}" class="chat-image openImage">

        <span class="time">${msg.time}</span>
    `;

  messageArea.appendChild(div);
  const img = div.querySelector(".openImage");

  img.addEventListener("click", () => {
    document.getElementById("modalImage").src = msg.image;
    document.getElementById("imageModal").style.display = "flex";
  });

  scrollToBottom();
}

function appendFile(msg, type) {
  let div = document.createElement("div");

  div.classList.add(type, "message");

  div.innerHTML = `
      <h4>${msg.user}</h4>

      <a href="${msg.file}" target="_blank" rel="noopener noreferrer" class="file-link">
          📄 ${msg.fileName}
      </a>

      <span class="time">${msg.time}</span>
  `;

  messageArea.appendChild(div);

  scrollToBottom();
}

socket.on("message", (msg) => {
  console.log(msg);
  appendMessage(msg, "incoming");
  scrollToBottom();
});
function scrollToBottom() {
  messageArea.scrollTop = messageArea.scrollHeight;
}

socket.on("voice", (msg) => {
  appendVoice(msg, "incoming");
});

socket.on("image", (msg) => {
  appendImage(msg, "incoming");
});

socket.on("file", (msg) => {
  appendFile(msg, "incoming");
});

function getCurrentTime() {
  return new Date().toLocaleString("en-BD", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

sendBtn.addEventListener("click", () => {
  const message = textarea.value.trim();

  if (message) {
    sendMessage(message);
  }

  if (selectedImage) {
    const msg = {
      user: name,
      image: selectedImage,
      time: getCurrentTime(),
    };

    appendImage(msg, "outgoing");

    socket.emit("image", msg);

    selectedImage = "";
    previewBox.style.display = "none";
    imageInput.value = "";
  }
});

textarea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    sendBtn.click();
  }
});
textarea.addEventListener("input", () => {
  socket.emit("typing", name);
});
socket.on("typing", (user) => {
  const typing = document.getElementById("typing");

  typing.innerText = `${user} is typing...`;

  clearTimeout(window.typingTimer);

  window.typingTimer = setTimeout(() => {
    typing.innerText = "";
  }, 1000);
});

const emojiPicker = document.getElementById("emojiPicker");
const emojiBtn = document.getElementById("emojiBtn");

const picker = new EmojiMart.Picker({
  onEmojiSelect: (emoji) => {
    textarea.value += emoji.native;
    textarea.focus();

    emojiPicker.style.display = "none";
  },
});

emojiPicker.appendChild(picker);

emojiBtn.addEventListener("click", () => {
  emojiPicker.style.display =
    emojiPicker.style.display === "block" ? "none" : "block";
});

recordBtn.addEventListener("click", async () => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });

    mediaRecorder = new MediaRecorder(stream);

    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, {
        type: "audio/webm",
      });

      const reader = new FileReader();

      reader.onloadend = () => {
        socket.emit("voice", {
          user: name,
          audio: reader.result,
          time: getCurrentTime(),
        });

        appendVoice(
          {
            user: name,
            audio: reader.result,
            time: getCurrentTime(),
          },
          "outgoing",
        );
      };

      reader.readAsDataURL(audioBlob);
    };

    mediaRecorder.start();

    recordBtn.innerText = "⏹";
  } else {
    mediaRecorder.stop();

    recordBtn.innerText = "🎤";
  }
});

imageBtn.addEventListener("click", () => {
  imageInput.click();
});

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    selectedImage = reader.result;

    previewImg.src = selectedImage;

    previewBox.style.display = "block";
  };

  reader.readAsDataURL(file);
});

cancelPreview.addEventListener("click", () => {
  selectedImage = "";

  previewBox.style.display = "none";

  imageInput.value = "";
});

const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const closeModal = document.getElementById("closeModal");

closeModal.addEventListener("click", () => {
  imageModal.style.display = "none";
});

imageModal.addEventListener("click", (e) => {
  if (e.target === imageModal) {
    imageModal.style.display = "none";
  }
});

const themeBtn = document.getElementById("themeBtn");

// Page Reload হলেও Theme মনে থাকবে
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeBtn.innerText = "☀️";
}

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
    themeBtn.innerText = "☀️";
  } else {
    localStorage.setItem("theme", "light");
    themeBtn.innerText = "🌙";
  }
});

fileBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];

  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  fetch("/upload", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      const msg = {
        user: name,
        file: data.file,
        fileName: data.fileName,
        time: getCurrentTime(),
      };

      appendFile(msg, "outgoing");

      socket.emit("file", msg);

      fileInput.value = "";
    });
});
