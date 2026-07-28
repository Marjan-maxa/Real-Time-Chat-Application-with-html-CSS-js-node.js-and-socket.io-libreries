const socket = io();
const ringtone = document.getElementById("ringtone");
const backBtn = document.getElementById("backBtn");
const usersPanel = document.getElementById("usersPanel");
const chatUser = document.getElementById("chatUser");
function startRingtone() {
  ringtone.currentTime = 0;

  ringtone.play().catch((err) => {
    console.log("Ringtone Error:", err);
  });
}

function stopRingtone() {
  ringtone.pause();
  ringtone.currentTime = 0;
}

function startCallTimer() {
  clearInterval(callTimer);

  callSeconds = 0;

  callTimer = setInterval(() => {
    callSeconds++;

    const minutes = String(Math.floor(callSeconds / 60)).padStart(2, "0");
    const seconds = String(callSeconds % 60).padStart(2, "0");

    callStatus.innerText = `${minutes}:${seconds}`;
  }, 1000);
}

function stopCallTimer() {
  clearInterval(callTimer);

  callSeconds = 0;
}

let localStream;
let peerConnection;
let statsInterval;
let callTimer;
let callSeconds = 0;
let isMuted = false;
let cameraOff = false;
let useFrontCamera = true;
let cameraIndex = 0;
let pendingCaller = null;
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
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const previewBox = document.getElementById("imagePreview");
const previewImg = document.getElementById("previewImg");
const cancelPreview = document.getElementById("cancelPreview");

let selectedImage = "";
let name;
let pendingCandidates = [];
let selectedUser = null;
let pendingOffer = null;
let pendingCallType = "voice";
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

// Register this user
socket.emit("register-user", name);
function sendMessage(message) {
  console.log("Me:", name);
  console.log("Selected User:", selectedUser);
  if (!message.trim()) return;

  let msg = {
    user: name,
    message: message.trim(),
    time: getCurrentTime(),
  };

  appendMessage(msg, "outgoing");
  textarea.value = "";
  scrollToBottom();

  socket.emit("message", {
    ...msg,
    to: selectedUser,
  });
}
function appendMessage(msg, type) {
  let mainDiv = document.createElement("div");
  mainDiv.classList.add(type, "message");

  // নিজের message হলে Me দেখাবে, অন্যথায় sender-এর নাম
  const displayName = type === "outgoing" ? "Me" : msg.user;

  let isEmoji = /^\p{Emoji}+$/u.test(msg.message.trim());

  let markup;

  if (isEmoji) {
    mainDiv.classList.add("emoji-message");

    markup = `
  <div class="only-emoji">${msg.message}</div>
  <span class="time">${msg.time}</span>
`;
  } else {
    markup = `
      <h4>${displayName}</h4>
      <p>${msg.message}</p>
      <span class="time">${msg.time}</span>
  `;
  }

  mainDiv.innerHTML = markup;
  messageArea.appendChild(mainDiv);

  scrollToBottom();
}

function appendVoice(msg, type) {
  let div = document.createElement("div");

  div.classList.add(type, "message");
  const displayName = type === "outgoing" ? "Me" : msg.user;
  div.innerHTML = `
        <h4>${displayName}</h4>

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
  const displayName = type === "outgoing" ? "Me" : msg.user;
  div.innerHTML = `
        <h4>${displayName}</h4>

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
  const displayName = type === "outgoing" ? "Me" : msg.user;
  div.innerHTML = `
      <h4>${displayName}</h4>

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

async function createPeerConnection(video = true) {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  peerConnection = new RTCPeerConnection(configuration);

  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: video,
  });

  if (video) {
    localVideo.style.display = "block";

    localVideo.srcObject = localStream;

    localVideo.muted = true;

    localVideo.autoplay = true;

    localVideo.playsInline = true;

    await localVideo.play();
  } else {
    localVideo.style.display = "none";
  }
  localStream.getAudioTracks().forEach((track) => {
    console.log("🎤 Mic Track:", track.enabled, track.readyState, track.muted);
  });

  localStream.getTracks().forEach((track) => {
    console.log("Sending:", track.kind);

    const sender = peerConnection.addTrack(track, localStream);

    console.log("Sender:", sender.track.kind);
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log(event.candidate.candidate);

      socket.emit("ice-candidate", {
        candidate: event.candidate,
        to: selectedUser,
      });
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log("ICE:", peerConnection.iceConnectionState);

    if (peerConnection.iceConnectionState === "connected") {
      console.log("✅ Call Connected");

      callStatus.innerText = "Connected";

      startCallTimer();
    }

    if (
      peerConnection.iceConnectionState === "disconnected" ||
      peerConnection.iceConnectionState === "failed" ||
      peerConnection.iceConnectionState === "closed"
    ) {
      stopCallTimer();
    }
  };

  peerConnection.ontrack = async (event) => {
    console.log("Remote:", event.track.kind);

    const stream = event.streams[0];

    if (event.track.kind === "video") {
      remoteVideo.srcObject = stream;

      remoteVideo.style.display = "block";

      await remoteVideo.play().catch(console.log);
    }

    if (event.track.kind === "audio") {
      remoteAudio.srcObject = stream;

      remoteAudio.volume = 1;
      remoteAudio.muted = false;

      await remoteAudio.play().catch(console.log);
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

    socket.emit("image", {
      ...msg,
      to: selectedUser,
    });

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
  if (!selectedUser) return;

  socket.emit("typing", {
    user: name,
    to: selectedUser,
  });
});
socket.on("typing", (data) => {
  const typing = document.getElementById("typing");

  typing.innerText = `${data.user} is typing...`;

  clearTimeout(window.typingTimer);

  window.typingTimer = setTimeout(() => {
    typing.innerText = "";
  }, 1000);
});

socket.on("user-list", (users) => {
  const usersList = document.getElementById("usersList");

  usersList.innerHTML = "";

  users.forEach((user) => {
    if (user === name) return;

    const div = document.createElement("div");

    div.className = "user-item";

    div.innerHTML = "🟢 " + user;

    div.addEventListener("click", () => {
      selectedUser = user;

      document.getElementById("chatUser").textContent = user;
      userStatus.textContent = "🟢 Online";

      document.getElementById("backBtn").style.display = "block";

      document.getElementById("usersPanel").style.display = "none";

      document.querySelectorAll(".user-item").forEach((item) => {
        item.classList.remove("active-user");
      });

      div.classList.add("active-user");
    });

    usersList.appendChild(div);
  });
  if (selectedUser) {
    if (users.includes(selectedUser)) {
      userStatus.textContent = "🟢 Online";
    } else {
      userStatus.textContent = "🔴 Offline";
    }
  }
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

emojiBtn.addEventListener("click", (e) => {
  e.stopPropagation();

  emojiPicker.style.display =
    emojiPicker.style.display === "block" ? "none" : "block";
});

document.addEventListener("click", (e) => {
  if (!emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
    emojiPicker.style.display = "none";
  }
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

          socket.emit("voice", {
            ...msg,
            to: selectedUser,
          });

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
const videoCallBtn = document.getElementById("videoCallBtn");

const callPopup = document.getElementById("incomingCall");

const callerName = document.getElementById("callerName");

const acceptCall = document.getElementById("acceptCall");

const rejectCall = document.getElementById("rejectCall");

const callingScreen = document.getElementById("callingScreen");

const endCall = document.getElementById("endCall");
const muteBtn = document.getElementById("muteBtn");
const cameraBtn = document.getElementById("cameraBtn");
const switchCameraBtn = document.getElementById("switchCameraBtn");
const callStatus = document.getElementById("callStatus");
const userStatus = document.getElementById("userStatus");
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

      socket.emit("file", {
        ...msg,
        to: selectedUser,
      });

      fileInput.value = "";
    });
});
callBtn.addEventListener("click", async () => {
  if (!selectedUser) {
    alert("Please select a user first!");
    return;
  }
  console.log("📞 Voice Call");

  await createPeerConnection(false);

  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: false,
  });

  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", {
    offer,
    to: selectedUser,
    user: name,
  });

  socket.emit("call-user", {
    caller: name,
    to: selectedUser,
    type: "voice",
  });

  callingScreen.style.display = "flex";

  callStatus.innerText = "Voice Calling...";
});

videoCallBtn.addEventListener("click", async () => {
  console.log("📹 Video Call");

  await createPeerConnection(true);

  const offer = await peerConnection.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });

  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", {
    offer,
    to: selectedUser,
    user: name,
  });

  socket.emit("call-user", {
    caller: name,
    to: selectedUser,
    type: "video",
  });

  callingScreen.style.display = "flex";

  callStatus.innerText = "Video Calling...";
});

rejectCall.addEventListener("click", () => {
  stopRingtone();

  pendingOffer = null;

  pendingCandidates = [];

  callPopup.style.display = "none";

  socket.emit("reject-call", {
    to: pendingCaller,
  });
});

acceptCall.addEventListener("click", async () => {
  stopRingtone();
  if (!pendingOffer) return;
  callPopup.style.display = "none";

  callingScreen.style.display = "flex";

  callStatus.innerText = "Conncting...";

  const hasVideo = pendingCallType === "video";
  await createPeerConnection(hasVideo);

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

  socket.emit("answer", {
    answer,
    to: pendingCaller,
  });

  socket.emit("accept-call", {
    to: pendingCaller,
  });
});

endCall.addEventListener("click", () => {
  stopCallTimer();
  stopRingtone();
  callingScreen.style.display = "none";
  clearInterval(statsInterval);
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
    isMuted = false;
    muteBtn.innerText = "🎤 Mute";
    cameraOff = false;
    cameraBtn.innerText = "📷 Camera Off";
  }

  if (remoteAudio.srcObject) {
    remoteAudio.pause();
    remoteAudio.currentTime = 0;
    remoteAudio.srcObject = null;
  }
  remoteVideo.srcObject = null;
  remoteVideo.style.display = "none";

  remoteVideo.pause();
  localVideo.pause();
  localVideo.srcObject = null;
  callStatus.innerText = "Waiting...";
  socket.emit("end-call", {
    to: selectedUser,
  });
});

socket.on("incoming-call", (data) => {
  console.log("Incoming:", data);
  pendingCaller = data.caller;
  pendingCallType = data.type || "voice";

  callerName.innerText =
    data.caller +
    (pendingCallType === "video"
      ? " is video calling..."
      : " is voice calling...");

  callPopup.style.display = "flex";

  //  Start ringtone
  startRingtone();
});

socket.on("call-accepted", () => {
  callStatus.innerText = "Connected";
});

socket.on("call-rejected", () => {
  stopCallTimer();

  stopRingtone();

  callingScreen.style.display = "none";

  callStatus.innerText = "Waiting...";

  alert("Call Rejected");
});
socket.on("call-ended", () => {
  stopCallTimer();
  stopRingtone();
  callingScreen.style.display = "none";
  clearInterval(statsInterval);

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
    isMuted = false;
    muteBtn.innerText = "🎤 Mute";
    cameraOff = false;
    cameraBtn.innerText = "📷 Camera Off";
  }

  if (remoteAudio.srcObject) {
    remoteAudio.pause();
    remoteAudio.currentTime = 0;
    remoteAudio.srcObject = null;
  }

  remoteVideo.srcObject = null;
  remoteVideo.style.display = "none";

  remoteVideo.pause();
  localVideo.pause();
  localVideo.srcObject = null;
  callStatus.innerText = "Waiting...";
});

socket.on("offer", (data) => {
  console.log("📥 Offer Received");

  pendingOffer = data.offer;
  pendingCaller = data.from;
});

socket.on("answer", async (data) => {
  const answer = data.answer;

  if (peerConnection.signalingState !== "have-local-offer") return;

  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice-candidate", async (data) => {
  const candidate = data.candidate;

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

muteBtn.addEventListener("click", () => {
  if (!localStream) return;

  const audioTrack = localStream.getAudioTracks()[0];

  if (!audioTrack) return;

  isMuted = !isMuted;

  audioTrack.enabled = !isMuted;

  muteBtn.innerText = isMuted ? "🔇" : "🎤";
});

cameraBtn.addEventListener("click", () => {
  if (!localStream) return;

  const videoTrack = localStream.getVideoTracks()[0];

  if (!videoTrack) return;

  cameraOff = !cameraOff;

  videoTrack.enabled = !cameraOff;

  cameraBtn.innerText = cameraOff ? "📷 On" : "📷 Off";
});

switchCameraBtn.addEventListener("click", async () => {
  if (!peerConnection) return;

  await switchCamera();
});

async function switchCamera() {
  if (!peerConnection || !localStream) return;

  // সব camera বের করো
  const devices = await navigator.mediaDevices.enumerateDevices();

  const cameras = devices.filter((device) => device.kind === "videoinput");

  // যদি একটি camera থাকে
  if (cameras.length < 2) {
    alert("Only one camera found");
    return;
  }

  // পরের camera
  cameraIndex++;

  if (cameraIndex >= cameras.length) {
    cameraIndex = 0;
  }

  // পুরাতন video বন্ধ
  localStream.getVideoTracks().forEach((track) => {
    track.stop();
  });

  // নতুন camera চালু
  const newStream = await navigator.mediaDevices.getUserMedia({
    video: {
      deviceId: {
        exact: cameras[cameraIndex].deviceId,
      },
    },

    audio: false,
  });

  const newVideoTrack = newStream.getVideoTracks()[0];

  const sender = peerConnection.getSenders().find((sender) => {
    return sender.track && sender.track.kind === "video";
  });

  if (sender) {
    await sender.replaceTrack(newVideoTrack);
  }

  localVideo.srcObject = newStream;

  localStream.removeTrack(localStream.getVideoTracks()[0]);

  localStream.addTrack(newVideoTrack);
}

backBtn.addEventListener("click", () => {
  selectedUser = null;

  chatUser.textContent = "Select User";
  userStatus.textContent = "Offline";

  usersPanel.style.display = "block";

  backBtn.style.display = "none";
});
