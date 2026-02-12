import Boyfriend from "../models/Boyfriend.js";
import User from "../models/User.js";

// @desc    Fetch all boyfriends
// @route   GET /api/boyfriends
// @access  Public
// @desc    Fetch all boyfriends
// @route   GET /api/boyfriends
// @access  Public
const getBoyfriends = async (req, res) => {
    const { lat, lng, dist, page = 1, limit = 10, search } = req.query;
    let query = {};

    if (lat && lng && dist) {
        query.location = {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [parseFloat(lng), parseFloat(lat)]
                },
                $maxDistance: parseInt(dist) * 1000
            }
        };
    }

    // Filter by Verified Users
    const verifiedUsers = await User.find({ isVerified: true, role: 'boyfriend' }).select('_id');
    const verifiedUserIds = verifiedUsers.map(user => user._id);
    query.user = { $in: verifiedUserIds };

    if (search) {
        query.name = { $regex: search, $options: "i" };
    }

    // Clone query for counting
    let countQuery = JSON.parse(JSON.stringify(query));

    // Replace $near with $geoWithin for count (since count doesn't support $near sort)
    if (lat && lng && dist) {
        delete countQuery.location.$near;
        countQuery.location.$geoWithin = {
            $centerSphere: [
                [parseFloat(lng), parseFloat(lat)],
                parseInt(dist) / 6378.1 // Convert km to radians
            ]
        };
    }

    const count = await Boyfriend.countDocuments(countQuery);
    let queryBuilder = Boyfriend.find(query)
        .populate("user", "name isVerified profileImage")
        .limit(limit * 1)
        .skip((page - 1) * limit);

    // Only apply sort if NOT using $near (which sorts by distance automatically)
    if (!dist) {
        queryBuilder = queryBuilder.sort({ createdAt: -1 });
    }

    const boyfriends = await queryBuilder;

    res.json({
        boyfriends,
        totalPages: Math.ceil(count / limit),
        currentPage: page
    });
};

// @desc    Fetch single boyfriend
// @route   GET /api/boyfriends/:id
// @access  Public
const getBoyfriendById = async (req, res) => {
    const { id } = req.params;

    // Handle "preview" or invalid ObjectIds gracefully
    if (id === "preview" || !id.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(404);
        throw new Error("Boyfriend not found (Invalid ID)");
    }

    const boyfriend = await Boyfriend.findById(id)
        .populate("user", "name isVerified profileImage")
        .populate("reviews.user", "name profileImage");

    if (boyfriend) {
        res.json(boyfriend);
    } else {
        res.status(404);
        throw new Error("Boyfriend not found");
    }
};

// @desc    Get current user's boyfriend profile
// @route   GET /api/boyfriends/me
// @access  Private
const getMyBoyfriendProfile = async (req, res) => {
    const boyfriend = await Boyfriend.findOne({ user: req.user._id })
        .populate("user", "name isVerified profileImage")
        .populate("reviews.user", "name profileImage");

    if (boyfriend) {
        res.json(boyfriend);
    } else {
        res.status(404);
        throw new Error("Boyfriend profile not found");
    }
};

// @desc    Create a boyfriend listing
// @route   POST /api/boyfriends
// @access  Private
const createBoyfriend = async (req, res) => {
    const { name, bio, age, location, pricePerHour, images, traits, latitude, longitude, instagram, profileImage } = req.body;

    // Check if user already has a boyfriend profile
    const boyfriendExists = await Boyfriend.findOne({ user: req.user._id });
    if (boyfriendExists) {
        res.status(400);
        throw new Error("User already has a boyfriend profile");
    }

    // Validate Age
    if (!age || age < 18 || age > 70) {
        res.status(400);
        throw new Error("Age must be between 18 and 70");
    }

    // Ensure valid coordinates or default to [0,0] if missing (prevent NaN cast error)
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const validCoords = !isNaN(lat) && !isNaN(lng) ? [lng, lat] : [0, 0];

    const boyfriend = new Boyfriend({
        user: req.user._id,
        name,
        bio,
        age,
        location: {
            type: "Point",
            coordinates: validCoords,
            address: location
        },
        pricePerHour,
        images,
        profileImage,
        instagram,
        traits,
    });

    const createdBoyfriend = await boyfriend.save();

    // Reset verification status when main profile image changes (or is created)
    req.user.isVerified = false;
    await req.user.save();

    res.status(201).json(createdBoyfriend);
};

// @desc    Update boyfriend profile
// @route   PUT /api/boyfriends
// @access  Private
const updateBoyfriend = async (req, res) => {
    const boyfriend = await Boyfriend.findOne({ user: req.user._id });

    if (boyfriend) {
        boyfriend.name = req.body.name || boyfriend.name;
        boyfriend.bio = req.body.bio || boyfriend.bio;
        boyfriend.age = req.body.age || boyfriend.age;
        boyfriend.pricePerHour = req.body.pricePerHour || boyfriend.pricePerHour;
        boyfriend.instagram = req.body.instagram || boyfriend.instagram;
        boyfriend.traits = req.body.traits || boyfriend.traits;
        boyfriend.images = req.body.images || boyfriend.images;
        boyfriend.images = req.body.images || boyfriend.images;

        // Reset verification if profile image changes
        if (req.body.profileImage && req.body.profileImage !== boyfriend.profileImage) {
            boyfriend.profileImage = req.body.profileImage;

            const user = await User.findById(req.user._id);
            if (user) {
                user.isVerified = false;
                await user.save();
            }
        } else {
            boyfriend.profileImage = req.body.profileImage || boyfriend.profileImage;
        }

        // Update location if provided
        if (req.body.location && req.body.latitude && req.body.longitude) {
            boyfriend.location = {
                type: "Point",
                coordinates: [req.body.longitude, req.body.latitude],
                address: req.body.location
            };
        }

        const updatedBoyfriend = await boyfriend.save();
        res.json(updatedBoyfriend);
    } else {
        res.status(404);
        throw new Error("Boyfriend profile not found");
    }
};

export { getBoyfriends, getBoyfriendById, createBoyfriend, getMyBoyfriendProfile, updateBoyfriend };
