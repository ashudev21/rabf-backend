import express from "express";
import { verifyUser, getUserProfile, getUserById, updateUserProfile } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/verify", protect, verifyUser);
router.route("/profile").get(protect, getUserProfile).put(protect, updateUserProfile);
router.get("/:id", protect, getUserById);

export default router;
