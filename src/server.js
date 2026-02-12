import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/database.js";
import authRoutes from "./routes/authRoutes.js";
import boyfriendRoutes from "./routes/boyfriendRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

dotenv.config({ override: true });
const PORT = 3000

import http from "http";
import { initializeSocket } from "./socket.js";
import { initNotificationService } from "./services/notificationService.js";

import cors from "cors";

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Initialize Socket.IO
// Initialize Socket.IO
initializeSocket(server);

// Initialize Notification Service (Redis)
initNotificationService();

connectDB();

import chatRoutes from "./routes/chatRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import "./queue/worker.js"; // Start Email Worker

app.use("/api/auth", authRoutes);
app.use("/api/boyfriends", boyfriendRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/notifications", notificationRoutes);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});