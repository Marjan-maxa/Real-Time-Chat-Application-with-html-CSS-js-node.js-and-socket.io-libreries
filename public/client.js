const socket = io();

let localStream;
let peerConnection;
let statsInterval;
const configuration = {
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "cc66adeded90f0e0741825d7",
      credential: "r03cyHzXhqe1vJfn",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "cc66adeded90f0e0741825d7",
      credential: "r03cyHzXhqe1vJfn",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "cc66adeded90f0e0741825d7",
      credential: "r03cyHzXhqe1vJfn",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "cc66adeded90f0e0741825d7",
      credential: "r03cyHzXhqe1vJfn",
    },
  ],
};

const remoteAudio = document.getElementById("remoteAudio");

const previewBox = document.getElementById("imagePreview");
const previewImg = document.getElementById("previewImg");
const cancelPreview = document.getElementById("cancelPreview");

let selectedImage = "";
let name;
let pendingCandidates = [];
let pendingOffer = null;
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

async function createPeerConnection() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  peerConnection = new RTCPeerConnection(configuration);

  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  });

  localStream.getAudioTracks().forEach((track) => {
    console.log("🎤 Mic Track:", track.enabled, track.readyState, track.muted);
  });

  localStream.getTracks().forEach((track) => {
    console.log("🎤 Sending track:", track.kind);

    peerConnection.addTrack(track, localStream);
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log(event.candidate.candidate);

      socket.emit("ice-candidate", event.candidate);
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log("ICE State:", peerConnection.iceConnectionState);
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log("ICE:", peerConnection.iceConnectionState);
  };

  peerConnection.ontrack = async (event) => {
    console.log("🔊 Remote audio received");
    console.log("Tracks:", event.streams[0].getTracks());

    console.log("Audio Tracks:", event.streams[0].getAudioTracks());

    console.log(
      event.streams[0].getAudioTracks()[0].enabled,
      event.streams[0].getAudioTracks()[0].muted,
    );
    const stream = event.streams[0];

    console.log("Remote tracks:", stream.getAudioTracks());

    remoteAudio.srcObject = stream;

    remoteAudio.srcObject = stream;

    remoteAudio.volume = 1;
    remoteAudio.muted = false;

    console.log("Volume:", remoteAudio.volume, "Muted:", remoteAudio.muted);

    try {
      await remoteAudio.play();

      console.log("▶️ Audio playing");
    } catch (error) {
      console.log("Play error:", error);
    }
  };

  clearInterval(statsInterval);

  statsInterval = setInterval(async () => {
    if (!peerConnection) return;

    const stats = await peerConnection.getStats();

    stats.forEach((report) => {
      if (report.type === "inbound-rtp" && report.kind === "audio") {
        console.log(
          "📥 Received:",
          report.packetsReceived,
          "bytes:",
          report.bytesReceived,
        );
      }

      if (report.type === "outbound-rtp" && report.kind === "audio") {
        console.log("📤 Sent:", report.packetsSent, "bytes:", report.bytesSent);
      }
    });
  }, 2000);

  console.log("✅ Peer Connection Ready");
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
  console.log("🎤 RECORD BUTTON CLICKED");
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      console.log("🎤 MIC OK", stream);

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
          const msg = {
            user: name,
            audio: reader.result,
            time: getCurrentTime(),
          };

          socket.emit("voice", msg);

          appendVoice(msg, "outgoing");
        };

        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();

      recordBtn.innerText = "⏹";
    } catch (error) {
      console.log("🎤 MIC ERROR", error);
    }
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

const callBtn = document.getElementById("callBtn");

const callPopup = document.getElementById("incomingCall");

const callerName = document.getElementById("callerName");

const acceptCall = document.getElementById("acceptCall");

const rejectCall = document.getElementById("rejectCall");

const callingScreen = document.getElementById("callingScreen");

const endCall = document.getElementById("endCall");

const callStatus = document.getElementById("callStatus");

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
callBtn.addEventListener("click", async () => {
  console.log("📞 CALL BUTTON CLICKED");
  await createPeerConnection();

  const offer = await peerConnection.createOffer();

  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", offer);

  socket.emit("call-user", {
    caller: name,
  });

  callingScreen.style.display = "flex";

  callStatus.innerText = "Calling...";
});

rejectCall.addEventListener("click", () => {
  pendingOffer = null;

  callPopup.style.display = "none";

  socket.emit("reject-call");
});

acceptCall.addEventListener("click", async () => {
  if (!pendingOffer) return;
  callPopup.style.display = "none";

  callingScreen.style.display = "flex";

  callStatus.innerText = "Connected";

  await createPeerConnection();

  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(pendingOffer),
  );

  for (const candidate of pendingCandidates) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  pendingOffer = null;
  pendingCandidates = [];

  const answer = await peerConnection.createAnswer();

  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", answer);

  socket.emit("accept-call");
});

endCall.addEventListener("click", () => {
  callingScreen.style.display = "none";
  clearInterval(statsInterval);
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  if (remoteAudio.srcObject) {
    remoteAudio.pause();
    remoteAudio.srcObject = null;
  }

  socket.emit("end-call");
});

socket.on("incoming-call", (data) => {
  console.log("📲 Incoming Call:", data);

  callerName.innerText = data.caller + " is calling...";

  callPopup.style.display = "flex";
});

socket.on("call-accepted", () => {
  callStatus.innerText = "Connected";
});

socket.on("call-rejected", () => {
  callingScreen.style.display = "none";

  alert("Call Rejected");
});

socket.on("call-ended", () => {
  callingScreen.style.display = "none";
  clearInterval(statsInterval);

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  if (remoteAudio.srcObject) {
    remoteAudio.pause();
    remoteAudio.srcObject = null;
  }
});

socket.on("offer", (offer) => {
  console.log("📩 Offer received");

  pendingOffer = offer;
});

socket.on("answer", async (answer) => {
  if (peerConnection.signalingState !== "have-local-offer") {
    return;
  }

  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice-candidate", async (candidate) => {
  if (!peerConnection) {
    console.log("⏳ ICE queued (no peer yet)");
    pendingCandidates.push(candidate);
    return;
  }

  if (peerConnection.remoteDescription) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));

    console.log("✅ ICE Added");
  } else {
    console.log("⏳ ICE queued");
    pendingCandidates.push(candidate);
  }
});
