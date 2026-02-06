const chatWindow = document.getElementById("chatWindow");
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");
const profileName = document.getElementById("profileName");
const nameInput = document.getElementById("nameInput");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const sendBtnSecondary = document.getElementById("sendBtnSecondary");
const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const progressBar = document.getElementById("progressBar");

const socketProtocol = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${socketProtocol}://${location.host}`);

const addMessage = (content, meta, type = "chat") => {
  const item = document.createElement("div");
  item.className = `message ${type}`;
  if (meta) {
    const metaEl = document.createElement("div");
    metaEl.className = "meta";
    metaEl.textContent = meta;
    item.appendChild(metaEl);
  }
  const text = document.createElement("div");
  text.textContent = content;
  item.appendChild(text);
  chatWindow.appendChild(item);
  chatWindow.scrollTop = chatWindow.scrollHeight;
};

const addFile = (file) => {
  const item = document.createElement("li");
  item.className = "file-item";
  const link = document.createElement("a");
  link.href = file.url;
  link.textContent = file.name;
  link.target = "_blank";
  const size = document.createElement("span");
  size.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;
  item.appendChild(link);
  item.appendChild(size);
  fileList.prepend(item);
};

socket.addEventListener("open", () => {
  statusIndicator.classList.add("connected");
  statusText.textContent = "已连接";
});

socket.addEventListener("close", () => {
  statusIndicator.classList.remove("connected");
  statusText.textContent = "已断开";
});

socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "chat") {
    addMessage(
      data.payload.text,
      `${data.payload.name} · ${new Date(data.payload.time).toLocaleTimeString()}`
    );
  }
  if (data.type === "system") {
    addMessage(data.payload.message, null, "system");
  }
  if (data.type === "file") {
    addFile(data.payload);
    addMessage(
      `文件已就绪：${data.payload.name}`,
      "文件快传",
      "system"
    );
  }
});

const sendMessage = () => {
  const text = messageInput.value.trim();
  if (!text) return;
  const name = nameInput.value.trim() || "匿名";
  socket.send(
    JSON.stringify({
      type: "chat",
      payload: { name, text }
    })
  );
  messageInput.value = "";
};

const syncProfileName = () => {
  const name = nameInput.value.trim();
  profileName.textContent = name || "未设置昵称";
};

sendBtn.addEventListener("click", sendMessage);
sendBtnSecondary.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

nameInput.addEventListener("input", syncProfileName);

const uploadFile = (file) => {
  progressBar.style.width = "0%";
  const formData = new FormData();
  formData.append("file", file);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/upload", true);
  xhr.upload.addEventListener("progress", (event) => {
    if (event.lengthComputable) {
      const percent = (event.loaded / event.total) * 100;
      progressBar.style.width = `${percent.toFixed(0)}%`;
    }
  });
  xhr.addEventListener("load", () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      progressBar.style.width = "100%";
    }
  });
  xhr.send(formData);
};

uploadArea.addEventListener("dragover", (event) => {
  event.preventDefault();
  uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", (event) => {
  event.preventDefault();
  uploadArea.classList.remove("dragover");
  const file = event.dataTransfer.files[0];
  if (file) {
    uploadFile(file);
  }
});

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    uploadFile(file);
  }
});
