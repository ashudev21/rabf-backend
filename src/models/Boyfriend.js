import mongoose from "mongoose";

const boyfriendSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    bio: {
        type: String,
        required: true,
    },
    age: {
        type: Number,
        required: true,
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
        },
        coordinates: {
            type: [Number],
            required: true, // [longitude, latitude]
        },
        address: {
            type: String,
        },
    },
    pricePerHour: {
        type: Number,
        required: true,
    },
    profileImage: {
        type: String,
        required: true,
    },
    images: [{
        type: String, // Gallery Image URLs
    }],
    instagram: {
        type: String,
    },
    traits: [{
        type: String,
    }],
    rating: {
        type: Number,
        default: 0,
    },
    reviews: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        comment: String,
        rating: Number,
    }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
});

boyfriendSchema.index({ location: "2dsphere" });

const Boyfriend = mongoose.model("Boyfriend", boyfriendSchema);

export default Boyfriend;
