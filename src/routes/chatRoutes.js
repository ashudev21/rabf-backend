import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getChats, getChatMessages, sendMessage } from "../controllers/chatController.js";

const router = express.Router();

router.get("/", protect, getChats);
router.post("/", protect, sendMessage);
router.get("/:userId", protect, getChatMessages);

export default router;
