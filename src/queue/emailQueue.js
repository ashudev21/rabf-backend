import { Queue } from "bullmq";
import { ValkeyConnection } from "../config/valkey.js";

const jobOptions = {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 2000,
    },
    // delay: 3000, 
    // Note: 'delay' in jobOptions sets a delay for *every* job added. 
    // If you want rate limiting, use 'limiter' in queue options. 
    // But per user request, I will keep the structure similar to their snippet.
};

export const emailQueue = new Queue("email-queue", {
    connection: ValkeyConnection,
    defaultJobOptions: jobOptions,
    // Add rate limiter if needed to avoid spamming
    limiter: {
        max: 10,
        duration: 1000, // 10 emails per second
    },
});
