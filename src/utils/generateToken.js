import jwt from "jsonwebtoken";
const generateToken = (res, userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "30d",
    });

    res.cookie("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development", // Must be true for SameSite=None
        sameSite: process.env.NODE_ENV === "development" ? "lax" : "none", // None is required for cross-site
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
};

export default generateToken;
