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
const PORT = process.env.PORT || 3000;

import http from "http";
import { initializeSocket } from "./socket.js";
import { initNotificationService } from "./services/notificationService.js";

import cors from "cors";

const app = express();
app.set("trust proxy", 1); // Trust first proxy (DigitalOcean/Vercel) for secure cookies
const server = http.createServer(app);

app.use(cors({
    origin: [process.env.CLIENT_URL, "https://www.rentyourdate.space", "https://rentyourdate.space" , "http://localhost:5173"],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
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

import reviewRoutes from "./routes/reviewRoutes.js";

app.get("/health", (req, res) => {
    res.json({ message: "OK" });
});

app.use("/api/auth", authRoutes);
app.use("/api/boyfriends", boyfriendRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});