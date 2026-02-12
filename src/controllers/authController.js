import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { addEmailToQueue } from "../queue/producer.js";
import jwt from "jsonwebtoken";

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        // We allow login even if account is not verified, but frontend should block access to features

        generateToken(res, user._id);

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            profileImage: user.profileImage,
            isVerified: user.isVerified, // Profile verification
            isAccountVerified: user.isAccountVerified, // Email verification
        });
    } else {
        res.status(401);
        throw new Error("Invalid email or password");
    }
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, phoneNumber, profileImage, role } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error("User already exists");
    }

    const user = await User.create({
        name,
        email,
        password,
        phoneNumber,
        profileImage,
        role,
        isVerified: false,
        isAccountVerified: false,
    });

    if (user) {
        generateToken(res, user._id);

        // Generate Verification Token
        const verificationToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

        // Send Verification Email
        await addEmailToQueue({
            email: user.email,
            subject: "Verify your Account - Rent-A-Boyfriend",
            template: "verifyEmail.ejs",
            data: {
                name: user.name,
                url: verificationUrl
            }
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            profileImage: user.profileImage,
            isVerified: user.isVerified,
            isAccountVerified: user.isAccountVerified,
            message: "User registered. Please check email to verify account."
        });
    } else {
        res.status(400);
        throw new Error("Invalid user data");
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
    res.cookie("jwt", "", {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({ message: "Logged out successfully" });
};

// @desc    Verify Email
// @route   GET /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        res.status(400);
        throw new Error("Invalid or missing token");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            res.status(404);
            throw new Error("User not found");
        }

        if (user.isAccountVerified) {
            return res.status(200).json({ message: "Email already verified" });
        }

        user.isAccountVerified = true;
        await user.save();

        res.status(200).json({ message: "Email verified successfully" });
    } catch (error) {
        res.status(400);
        throw new Error("Invalid or expired token");
    }
};

// @desc    Resend Verification Email
// @route   POST /api/auth/resend-verification
// @access  Private (User must be logged in to resend)
const resendVerificationEmail = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    if (user.isAccountVerified) {
        res.status(400);
        throw new Error("Account already verified");
    }

    const verificationToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

    await addEmailToQueue({
        email: user.email,
        subject: "Verify your Account - Rent-A-Boyfriend",
        template: "verifyEmail.ejs",
        data: {
            name: user.name,
            url: verificationUrl
        }
    });

    res.status(200).json({ message: "Verification email resent" });
};

// @desc    Forgot Password - Send Reset Link
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    // Generate Reset Token (Short lived: 10 mins)
    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '10m' });
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    await addEmailToQueue({
        email: user.email,
        subject: "Reset Password - Rent-A-Boyfriend",
        template: "forgotpassword.ejs",
        data: {
            name: user.name,
            url: resetUrl
        }
    });

    res.status(200).json({ message: "Password reset link sent to email" });
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        res.status(400);
        throw new Error("Token and new password are required");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            res.status(404);
            throw new Error("User not found");
        }

        user.password = newPassword; // Pre-save hook will hash it
        await user.save();

        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        res.status(400);
        throw new Error("Invalid or expired token");
    }
};

// @desc    Get temporary token for mobile handover
// @route   GET /api/auth/mobile-handover
// @access  Private
const getMobileHandoverToken = async (req, res) => {
    // Generate a short-lived token (e.g., 5 minutes) specifically for handover
    const token = jwt.sign({ userId: req.user._id, type: 'handover' }, process.env.JWT_SECRET, {
        expiresIn: '5m',
    });

    res.json({ token });
};

// @desc    Login via mobile handover token
// @route   POST /api/auth/mobile-login
// @access  Public
const mobileLogin = async (req, res) => {
    const { token } = req.body;

    if (!token) {
        res.status(400);
        throw new Error("No token provided");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type !== 'handover') {
            res.status(401);
            throw new Error("Invalid token type");
        }

        const user = await User.findById(decoded.userId);

        if (user) {
            // Generate standard session token/cookie
            generateToken(res, user._id);

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phoneNumber: user.phoneNumber,
                profileImage: user.profileImage,
                isVerified: user.isVerified,
                isAccountVerified: user.isAccountVerified,
            });
        } else {
            res.status(404);
            throw new Error("User not found");
        }
    } catch (error) {
        res.status(401);
        throw new Error("Invalid or expired token");
    }
};

// @desc    Check if user is logged in
// @route   GET /api/auth/check
// @access  Private
const checkAuth = async (req, res) => {
    if (req.user) {
        res.json({
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            phoneNumber: req.user.phoneNumber,
            profileImage: req.user.profileImage,
            isVerified: req.user.isVerified,
            isAccountVerified: req.user.isAccountVerified,
        });
    } else {
        // Send 401 but do not throw an Error (avoids stack trace in logs)
        res.status(401).json({ message: "Not authorized" });
    }
};

export {
    loginUser,
    registerUser,
    logoutUser,
    getMobileHandoverToken,
    mobileLogin,
    checkAuth,
    verifyEmail,
    resendVerificationEmail,
    forgotPassword,
    resetPassword
};
