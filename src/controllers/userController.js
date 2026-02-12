import User from "../models/User.js";

// @desc    Verify user
// @route   POST /api/users/verify
// @access  Private
const verifyUser = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.isVerified = true;
        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            isVerified: updatedUser.isVerified,
        });
    } else {
        res.status(404);
        throw new Error("User not found");
    }
};

// @desc    Get user profile (Self)
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
    if (!req.user) {
        res.status(404);
        throw new Error("User not found");
    }
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            profileImage: user.profileImage,
            isVerified: user.isVerified,
        });
    } else {
        res.status(404);
        throw new Error("User not found");
    }
};

// @desc    Get user by ID (Public/Basic Info)
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
    const user = await User.findById(req.params.id).select("-password -email -phoneNumber");

    if (user) {
        res.json(user);
    } else {
        res.status(404);
        throw new Error("User not found");
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.profileImage = req.body.profileImage || user.profileImage;
        if (req.body.phoneNumber) {
            user.phoneNumber = req.body.phoneNumber;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            phoneNumber: updatedUser.phoneNumber,
            profileImage: updatedUser.profileImage,
            isVerified: updatedUser.isVerified,
        });
    } else {
        res.status(404);
        throw new Error("User not found");
    }
};

export { verifyUser, getUserProfile, getUserById, updateUserProfile };
