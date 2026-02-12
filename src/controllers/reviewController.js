import Review from "../models/Review.js";
import Boyfriend from "../models/Boyfriend.js";
import Booking from "../models/Booking.js";

// @desc    Create new review
// @route   POST /api/reviews
// @access  Private
const createReview = async (req, res) => {
    const { rating, comment, boyfriendId } = req.body;

    const boyfriend = await Boyfriend.findById(boyfriendId);

    if (!boyfriend) {
        res.status(404);
        throw new Error("Boyfriend not found");
    }

    // Check if user has a *completed* booking with this boyfriend
    const hasBooking = await Booking.findOne({
        user: req.user._id,
        boyfriend: boyfriendId,
        status: "completed"
    });

    if (!hasBooking) {
        res.status(400);
        throw new Error("You can only review after a completed booking");
    }

    // Check if user already reviewed? 
    // Optional: allow re-review or multiple reviews. 
    // Let's restrict to 1 review per boyfriend to prevent spam, or maybe allow if new booking?
    // Doing strict check for now:
    const alreadyReviewed = await Review.findOne({
        user: req.user._id,
        boyfriend: boyfriendId
    });

    if (alreadyReviewed) {
        res.status(400);
        throw new Error("You have already reviewed this boyfriend");
    }

    const review = await Review.create({
        user: req.user._id,
        boyfriend: boyfriendId,
        rating: Number(rating),
        comment,
    });

    // Update Boyfriend's average rating
    // We can do this via aggregation or simple update
    const reviews = await Review.find({ boyfriend: boyfriendId });
    boyfriend.rating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

    // Also save the review in the boyfriend document if we want to embed a preview (optional but good for speed)
    // The current Boyfriend model has a `reviews` array. We should probably sync it or just rely on the independent Review model.
    // Given we made a separate model for pagination, keeping the array in Boyfriend might be redundant OR useful for just the top 3.
    // Let's push to the array for now to maintain backward compat with existing frontend that might read `boyfriend.reviews`.
    boyfriend.reviews.push({
        user: req.user._id,
        rating: Number(rating),
        comment,
        _id: review._id
    });

    await boyfriend.save();

    res.status(201).json(review);
};

// @desc    Get reviews for a boyfriend with pagination
// @route   GET /api/reviews/:boyfriendId
// @access  Public
const getReviews = async (req, res) => {
    const { boyfriendId } = req.params;
    const pageSize = 5;
    const page = Number(req.query.page) || 1;

    const count = await Review.countDocuments({ boyfriend: boyfriendId });
    const reviews = await Review.find({ boyfriend: boyfriendId })
        .populate("user", "name profileImage")
        .sort({ createdAt: -1 })
        .limit(pageSize)
        .skip(pageSize * (page - 1));

    res.json({
        reviews,
        page,
        pages: Math.ceil(count / pageSize),
        total: count
    });
};

export { createReview, getReviews };
