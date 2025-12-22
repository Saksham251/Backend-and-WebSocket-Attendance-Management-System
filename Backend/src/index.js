import http from "http";
import dotenv from "dotenv";
import app from "./app.js";
import { setupWebSocket } from "./websocket/index.js";

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// attach websocket
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
