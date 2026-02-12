import IORedis from "ioredis";
import { REDIS_URL } from "./redis.js";

export const ValkeyConnection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
});
