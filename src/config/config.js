import dotenv from "dotenv";

dotenv.config();

export const _config = {
    SMTP_HOST: (process.env.SMTP_HOST || "").replace(/["',]/g, ""),
    SMTP_PORT: (process.env.SMTP_PORT || "587").replace(/["',]/g, ""),
    SMTP_SERVICE: (process.env.SMTP_SERVICE || "").replace(/["',]/g, ""),
    SMTP_USER: (process.env.SMTP_USER || "").replace(/["',]/g, ""),
    SMTP_PASS: (process.env.SMTP_PASS || "zwpk oetq ufal isnm").replace(/["',]/g, ""), // Fallback to hardcoded if env missing

    PORT: process.env.PORT,
    MONGO_URI: process.env.MONGO_URI,
    REDIS_URL: process.env.REDIS_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV,

    IMAGEKIT_PUBLIC_KEY: process.env.IMAGEKIT_PUBLIC_KEY,
    IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY,
    IMAGEKIT_ENDPOINT: process.env.IMAGEKIT_ENDPOINT,
};
