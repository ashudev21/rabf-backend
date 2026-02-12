import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    boyfriend: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Boyfriend",
        required: true,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
        required: true,
    },
    meetingLocation: {
        type: String,
        required: true,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "completed", "cancelled"],
        default: "pending",
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid"],
        default: "pending",
    },
}, {
    timestamps: true,
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
