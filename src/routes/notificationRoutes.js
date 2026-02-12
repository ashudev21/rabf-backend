import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { subscribeToNotifications } from "../services/notificationService.js";

const router = express.Router();

router.get("/stream", protect, subscribeToNotifications);

export default router;
