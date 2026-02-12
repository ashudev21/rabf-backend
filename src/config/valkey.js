import { _config } from "./config.js";
import IORedis from "ioredis";

const redisOptions = {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    // SSL/TLS settings for managed Redis (DigitalOcean, etc.)
    tls: _config.REDIS_URL.startsWith("rediss://") ? {
        rejectUnauthorized: false // Often needed for managed services
    } : undefined
};

export const ValkeyConnection = new IORedis(_config.REDIS_URL, redisOptions);

ValkeyConnection.on("error", (err) => {
    console.error("Redis Connection Error:", err.message);
});

ValkeyConnection.on("connect", () => {
    console.log("Redis Connected Successfully");
});
