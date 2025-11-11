import { io } from "socket.io-client";

// Socket.IO base URL - matches your backend server
// Update this to match your backend URL
const API_BASE = "http://192.168.254.114:3000"; // Same as your current API

export const SOCKET_BASE = API_BASE;

// Create socket connection with credentials for authentication
export const socket = io(SOCKET_BASE, {
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

// Debug connection lifecycle (can be removed in production)
socket.on("connect", () => {
  console.log("[socket-client] connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("[socket-client] disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.error("[socket-client] connect_error:", err?.message || err, "base:", SOCKET_BASE);
});
