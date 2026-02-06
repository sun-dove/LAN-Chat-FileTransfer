const path = require("path");
const http = require("http");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^\w.\-\s]/g, "_");
    cb(null, `${timestamp}-${safeName}`);
  }
});

const upload = multer({ storage });

app.use(express.static(path.join(__dirname, "public")));
app.use("/files", express.static(uploadsDir));

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "未选择文件" });
  }
  const fileInfo = {
    name: req.file.originalname,
    size: req.file.size,
    url: `/files/${req.file.filename}`,
    time: new Date().toISOString()
  };
  broadcast({ type: "file", payload: fileInfo });
  return res.json({ ok: true, file: fileInfo });
});

const wss = new WebSocketServer({ server });

const broadcast = (message) => {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(data);
    }
  });
};

wss.on("connection", (socket) => {
  socket.send(
    JSON.stringify({
      type: "system",
      payload: { message: "已连接到局域网聊天室" }
    })
  );

  socket.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === "chat") {
        broadcast({
          type: "chat",
          payload: {
            name: message.payload.name || "匿名",
            text: message.payload.text,
            time: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      socket.send(
        JSON.stringify({
          type: "system",
          payload: { message: "消息格式错误" }
        })
      );
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`LAN Chat server running on http://0.0.0.0:${PORT}`);
});
