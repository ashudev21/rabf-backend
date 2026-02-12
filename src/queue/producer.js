import { emailQueue } from "./emailQueue.js";

export const addEmailToQueue = async (data) => {
    await emailQueue.add("send-email", data, {
        delay: 3000 // 3 second delay as requested by user in their snippet
    });
};
