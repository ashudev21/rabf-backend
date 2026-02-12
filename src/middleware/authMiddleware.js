import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protect = async (req, res, next) => {
    let token;

    token = req.cookies.jwt;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.userId).select("-password");

            if (!req.user) {
                res.status(401);
                throw new Error("Not authorized, user not found");
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401);
            // Clear the invalid cookie
            res.cookie("jwt", "", {
                httpOnly: true,
                expires: new Date(0),
            });
            throw new Error("Not authorized, token failed");
        }
    } else {
        res.status(401);
        throw new Error("Not authorized, no token");
    }
};

const protectSilent = async (req, res, next) => {
    let token;
    token = req.cookies.jwt;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.userId).select("-password");
        } catch (error) {
            // Token invalid or user not found, just proceed as guest
            req.user = null;
            // Optionally clear cookie if invalid?
            // res.clearCookie('jwt'); 
            // Better not to mess with cookies in silent mode unless sure
        }
    }
    // If no token, just proceed with req.user = undefined/null
    next();
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        res.status(401);
        throw new Error("Not authorized as an admin");
    }
};

export { protect, protectSilent, admin };
