import { Worker } from "bullmq";
import { ValkeyConnection } from "../config/valkey.js";
import emailHelper from "../utils/nodemailer.js";

export const emailWorker = new Worker(
    "email-queue",
    async (job) => {
        const { email, subject, template, data } = job.data;

        try {
            console.log(`Sending email to: ${email}`);

            const emailData = {
                email,
                subject,
                template,
                data: data || {},
            };

            await emailHelper(emailData);

            console.log(`Email sent to: ${email}`);
            return { success: true, email };

        } catch (error) {
            console.error(`Failed to send email to ${email}:`, error.message);
            throw error;
        }
    },
    {
        connection: ValkeyConnection,
        limiter: {
            max: 10,
            duration: 1000,
        },
    }
);

emailWorker.on("ready", () => {
    console.log("Email Worker is ready and connected to Redis.");
});

emailWorker.on("error", (err) => {
    console.error("Email Worker Error:", err);
});

emailWorker.on("completed", (job) => {
    console.log(`Job ${job.id} completed!`);
});

emailWorker.on("failed", (job, err) => {
    console.error(`Job ${job.id} failed: ${err.message}`);
});
