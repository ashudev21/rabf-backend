import express from "express";

import {
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
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/check", protect, checkAuth);
router.get("/mobile-handover", protect, getMobileHandoverToken);
router.post("/mobile-login", mobileLogin);

// Email Verification
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", protect, resendVerificationEmail);

// Password Reset
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
