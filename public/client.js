const socket = io();
let name;
const recordBtn = document.getElementById("recordBtn");

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
});

textarea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage(textarea.value);
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

    // Emoji select করলে picker বন্ধ হবে
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
