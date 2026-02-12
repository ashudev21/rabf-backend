import express from "express";
import { createReview, getReviews } from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").post(protect, createReview);
router.route("/:boyfriendId").get(getReviews);

export default router;
