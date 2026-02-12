import mongoose from "mongoose";

const reviewSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "User",
    },
    boyfriend: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Boyfriend",
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

// Prevent user from reviewing the same boyfriend multiple times
reviewSchema.index({ user: 1, boyfriend: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
