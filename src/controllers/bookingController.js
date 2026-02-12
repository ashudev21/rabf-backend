import Booking from "../models/Booking.js";
import Boyfriend from "../models/Boyfriend.js";
import { sendNotification } from "../services/notificationService.js";

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
const createBooking = async (req, res) => {
    const { boyfriendId, startTime, endTime, meetingLocation } = req.body;

    const boyfriend = await Boyfriend.findById(boyfriendId);

    if (!boyfriend) {
        res.status(404);
        throw new Error("Boyfriend not found");
    }

    // Calculate Duration in Hours
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours <= 0) {
        res.status(400);
        throw new Error("End time must be after start time");
    }

    const totalPrice = Math.ceil(durationHours * boyfriend.pricePerHour);

    const booking = new Booking({
        user: req.user._id,
        boyfriend: boyfriendId,
        startTime,
        endTime,
        meetingLocation,
        totalPrice,
    });

    const createdBooking = await booking.save();

    // Notify Boyfriend
    // boyfriend.user contains the User ID of the boyfriend
    try {
        await sendNotification(boyfriend.user, {
            type: "BOOKING_REQUEST",
            message: `New booking request!`,
            link: "/bookings"
        });
    } catch (err) {
        console.error("Notification error:", err);
    }

    res.status(201).json(createdBooking);
};

// @desc    Get logged in user's bookings
// @route   GET /api/bookings
// @access  Private
const getBookings = async (req, res) => {
    // Find bookings where user is the booker OR the boyfriend
    // First find if the user has a boyfriend profile
    const boyfriendProfile = await Boyfriend.findOne({ user: req.user._id });

    let query = { user: req.user._id };
    if (boyfriendProfile) {
        // If user is a boyfriend, also show bookings for them
        query = {
            $or: [
                { user: req.user._id },
                { boyfriend: boyfriendProfile._id }
            ]
        };
    }

    const bookings = await Booking.find(query)
        .populate("user", "name email")
        .populate("boyfriend", "name pricePerHour");

    res.json(bookings);
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id
// @access  Private
// @desc    Update booking status
// @route   PUT /api/bookings/:id
// @access  Private
const updateBookingStatus = async (req, res) => {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id)
        .populate("boyfriend")
        .populate("user");

    if (!booking) {
        res.status(404);
        throw new Error("Booking not found");
    }

    // Authorization Logic
    // 1. If status is "cancelled", only the user who booked (or admin) can cancel.
    // 2. If status is "accepted" or "rejected", only the boyfriend can do it.

    if (status === "cancelled") {
        if (booking.user._id.toString() !== req.user._id.toString()) {
            res.status(401);
            throw new Error("Not authorized to cancel this booking");
        }
        if (booking.status !== "pending") {
            res.status(400);
            throw new Error("Cannot cancel a booking that is already processed");
        }
    } else if (status === "accepted" || status === "rejected") {
        // Check if the logged-in user is the owner of the boyfriend profile
        // Note: booking.boyfriend is the Boyfriend document. We need to check its 'user' field.
        // But wait, booking.boyfriend is populated. Let's assume Boyfriend model has 'user' field.

        // We need to fetch the boyfriend profile associated with the current user to verify ownership
        // OR check if booking.boyfriend.user equals req.user._id

        // Let's assume booking.boyfriend has a 'user' field which is the ID of the user who owns the profile.
        // We need to make sure we populate it properly or fetch it. 
        // In getBookings we populated 'boyfriend', but here we are finding by ID.
        // Let's re-fetch boyfriend with user field if needed, or assume it's there. 
        // Actually, Boyfriend schema usually has `user`. 

        if (booking.boyfriend.user.toString() !== req.user._id.toString()) {
            res.status(401);
            throw new Error("Not authorized to update this booking");
        }
    } else {
        res.status(400);
        throw new Error("Invalid status update");
    }

    booking.status = status;
    const updatedBooking = await booking.save();

    // Notify User
    try {
        await sendNotification(booking.user._id, {
            type: "BOOKING_UPDATE",
            message: `Your booking was ${status}`,
            link: "/bookings"
        });
    } catch (err) {
        console.error("Notification error:", err);
    }

    res.json(updatedBooking);
};

export { createBooking, getBookings, updateBookingStatus };
