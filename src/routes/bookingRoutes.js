import express from "express";
import { createBooking, getBookings, updateBookingStatus } from "../controllers/bookingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/")
    .post(protect, createBooking)
    .get(protect, getBookings);

router.route("/:id")
    .put(protect, updateBookingStatus);

export default router;
