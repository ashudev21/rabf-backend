import Redis from "ioredis";
import { REDIS_URL } from "../config/redis.js";

let publisher;
let subscriber;
const clients = new Map(); // userId -> Set of output streams (res)

// Initialize Redis Clients
export const initNotificationService = () => {
    if (!REDIS_URL) {
        console.warn("Redis URL not provided. Notifications disabled.");
        return;
    }

    publisher = new Redis(REDIS_URL);
    subscriber = new Redis(REDIS_URL);

    subscriber.subscribe("notifications", (err) => {
        if (err) console.error("Failed to subscribe to notifications channel:", err);
        else console.log("Subscribed to notifications channel");
    });

    subscriber.on("message", (channel, message) => {
        if (channel === "notifications") {
            try {
                const { userId, payload } = JSON.parse(message);
                sendToClient(userId, payload);
            } catch (error) {
                console.error("Error parsing notification message:", error);
            }
        }
    });
};

// Handle SSE Connection
export const subscribeToNotifications = (req, res) => {
    const userId = req.user._id.toString();

    // SSE Headers
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    });

    // Add client to map
    if (!clients.has(userId)) {
        clients.set(userId, new Set());
    }
    clients.get(userId).add(res);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
        res.write(": keep-alive\n\n");
    }, 30000);

    // Initial connection confirmation
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    // Cleanup on close
    req.on("close", () => {
        clearInterval(heartbeat);
        const userClients = clients.get(userId);
        if (userClients) {
            userClients.delete(res);
            if (userClients.size === 0) {
                clients.delete(userId);
            }
        }
    });
};

// Publish Notification (Internal or from Controller)
export const sendNotification = async (userId, payload) => {
    if (!publisher) return;

    // Publish to Redis so all server instances get it
    // Payload should include type, message, link, timestamp, etc.
    const message = JSON.stringify({ userId, payload });
    await publisher.publish("notifications", message);
};

// Send to local client implementation
const sendToClient = (userId, payload) => {
    const userClients = clients.get(userId);
    if (userClients) {
        userClients.forEach((client) => {
            client.write(`data: ${JSON.stringify(payload)}\n\n`);
        });
    }
};
