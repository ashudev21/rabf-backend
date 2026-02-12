import express from "express";
import {
    getBoyfriends,
    getBoyfriendById,
    createBoyfriend,
    getMyBoyfriendProfile,
    updateBoyfriend,
} from "../controllers/boyfriendController.js";
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(getBoyfriends).post(protect, createBoyfriend).put(protect, updateBoyfriend);
router.get("/me", protect, getMyBoyfriendProfile);
router.route("/:id").get(getBoyfriendById);

export default router;
