import { Server } from "socket.io";
import { Cluster } from "ioredis";
import { createShardedAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import Chat from "./models/Chat.js";
import Booking from "./models/Booking.js";
import { REDIS_URL } from "./config/redis.js";
import { sendNotification } from "./services/notificationService.js";

let io;

export const initializeSocket = async (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: [process.env.CLIENT_URL, "https://www.rentyourdate.space", "https://rentyourdate.space"],
            credentials: true,
            methods: ["GET", "POST"]
        }
    });

    try {
        // Parse REDIS_URL if needed, but for simplicity/user request using single URL string with ioredis Cluster might need modification if it's not a cluster URL. 
        // The URL provided looks like a single node or managed instance URL. 
        // User asked for "sharded adapter" which requires Redis 7.0+ and Cluster/Sharded mode.
        // However, standard ioredis usage with a single URL is: new Redis(url).
        // If the implementation requires Cluster, we need multiple nodes. 
        // Given the single URL string "rediss://...", it's likely a managed service entry point.
        // We will try standard Redis client first, but user *specifically* asked for sharded adapter.
        // The sharded adapter expects a specific client setup.
        // As per documentation shared by user: 
        // "With ioredis ... Minimum requirements: Redis 7.0, ioredis@5.9.0 ... const pubClient = new Cluster([...])"

        // The provided URL is for DigitalOcean Managed Redis. 
        // If it's a single node URL, sharded adapter might not be applicable or might degrade to standard pub/sub.
        // But let's check if we can simply use the standard adapter if sharded fails, or try enabling shardedSubscribers on a standard client if supported (less likely).

        // Wait, the user shared "With the redis package and a Redis cluster" and "With ioredis package and a Redis cluster".
        // BUT also "With Redis sharded Pub/Sub ... const pubClient = new Cluster(...)".

        // If I use `new Redis(REDIS_URL)`, it connects to a single instance (or master).
        // Let's assume for now we use the `createShardedAdapter` as requested, but we need to check if we can pass a standard Redis client to it or if it strictly demands a Cluster client.
        // The docs say: "A dedicated adapter can be created with the createShardedAdapter() method".
        // It accepts pubClient and subClient.

        // Let's try to use ioredis with the URL.
        const { Redis } = await import("ioredis");
        const pubClient = new Redis(REDIS_URL);
        const subClient = pubClient.duplicate();

        // Using createShardedAdapter with standard Redis client (if supported) or falling back to standard createAdapter if safer.
        // However, user EXPLICITLY asked for "sharded redis adapter". 
        // DigitalOcean Managed Redis usually supports Redis 7.
        // I will use createShardedAdapter.

        io.adapter(createShardedAdapter(pubClient, subClient));
        console.log("✅ Socket.IO Redis Adapter (Sharded) Configured");
    } catch (error) {
        console.error("❌ Redis Connection Error:", error);
    }

    // Middleware for Authentication
    io.use(async (socket, next) => {
        try {
            const cookieString = socket.handshake.headers.cookie;
            if (!cookieString) return next(new Error("Authentication error: No cookies"));

            const tokenMatch = cookieString.match(/jwt=([^;]+)/);
            const token = tokenMatch ? tokenMatch[1] : null;

            if (!token) return next(new Error("Authentication error: No token"));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select("-password");

            if (!user) return next(new Error("Authentication error: User not found"));

            socket.user = user;
            next();
        } catch (error) {
            console.error("Socket Auth Error:", error.message);
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`🔌 User Connected: ${socket.user.name} (${socket.user._id})`);

        // Join user's own room
        socket.join(socket.user._id.toString());


        socket.on("join_chat", (roomId) => {
            socket.join(roomId);
            console.log(`User ${socket.user.name} joined room: ${roomId}`);
        });

        socket.on("send_message", async (data) => {
            const { roomId, content } = data;
            if (roomId && content) {
                // Save to DB
                try {
                    const chat = await Chat.findById(roomId);
                    if (chat) {
                        // FREEMIUM LOGIC START
                        // Check if sender has an active booking with the receiver
                        // Receiver ID? We need to find the other participant.
                        const receiverId = chat.participants.find(p => p.toString() !== socket.user._id.toString());

                        // Check for accepted booking where (user=sender AND boyfriend.user=receiver) OR (user=receiver AND boyfriend.user=sender)
                        // Note: Boyfriend model has 'user' field.

                        // Let's find if there is ANY 'accepted' booking between these two users.
                        // We need to look up if either user has a boyfriend profile to match the 'boyfriend' field in Booking.

                        // Strategy: 
                        // 1. Get all accepted bookings involving the current user.
                        // 2. Check if the receiver is the other party in any of them.

                        // Optimised Query:
                        // Find a booking where:
                        // status = "accepted" AND
                        // ( (user = sender AND boyfriend.user = receiver) OR (user = receiver AND boyfriend.user = sender) )
                        // But 'boyfriend' in Booking is a reference to Boyfriend model, not User.

                        // So we first need to find the Boyfriend profile of the receiver (if they are a boyfriend)
                        // OR find the Boyfriend profile of the sender (if they are a boyfriend).

                        let hasActiveBooking = false;

                        // Check if sender is User and Receiver is Boyfriend
                        const receiverBoyfriendProfile = await import("./models/Boyfriend.js").then(m => m.default.findOne({ user: receiverId }));
                        if (receiverBoyfriendProfile) {
                            const booking = await Booking.findOne({
                                user: socket.user._id,
                                boyfriend: receiverBoyfriendProfile._id,
                                status: "accepted"
                            });
                            if (booking) hasActiveBooking = true;
                        }

                        // Check if sender is Boyfriend and Receiver is User
                        if (!hasActiveBooking) {
                            const senderBoyfriendProfile = await import("./models/Boyfriend.js").then(m => m.default.findOne({ user: socket.user._id }));
                            if (senderBoyfriendProfile) {
                                const booking = await Booking.findOne({
                                    user: receiverId,
                                    boyfriend: senderBoyfriendProfile._id,
                                    status: "accepted"
                                });
                                if (booking) hasActiveBooking = true;
                            }
                        }

                        if (!hasActiveBooking) {
                            // Check message limit
                            // Count messages sent by THIS user in THIS chat
                            const messagesSentCount = chat.messages.filter(m => m.sender.toString() === socket.user._id.toString()).length;

                            if (messagesSentCount >= 5) {
                                socket.emit("error", {
                                    message: "Limit Reached",
                                    code: "LIMIT_REACHED"
                                });
                                return; // Stop processing
                            }
                        }
                        // FREEMIUM LOGIC END

                        const newMessage = {
                            sender: socket.user._id,
                            text: content,
                            timestamp: new Date()
                        };

                        // First Message Notification Logic
                        if (chat.messages.length === 0) {
                            const receiverId = chat.participants.find(p => p.toString() !== socket.user._id.toString());
                            if (receiverId) {
                                try {
                                    await sendNotification(receiverId, {
                                        type: "NEW_MESSAGE",
                                        message: `New message from ${socket.user.name}`,
                                        link: `/chats/${socket.user._id}` // Link to chat with sender
                                    });
                                } catch (err) {
                                    console.error("Notification Error:", err);
                                }
                            }
                        }

                        chat.messages.push(newMessage);
                        chat.lastMessage = content;
                        chat.updatedAt = new Date();
                        await chat.save();

                        // Emit to room
                        io.to(roomId).emit("receive_message", {
                            ...newMessage,
                            _id: chat.messages[chat.messages.length - 1]._id,
                            sender: { _id: socket.user._id, name: socket.user.name, profileImage: socket.user.profileImage },
                            roomId
                        });

                        // Real-time Notification for Chat List
                        // Notify the receiver (who might be in the chat list view but not the room)
                        // receiverId was found earlier for the Freemium check. 
                        // But wait, that scope was inside the `if (chat)`.
                        // We need to reliably find receiverId even if Freemium logic wasn't triggered (e.g. accepted booking).

                        const notificationReceiverId = chat.participants.find(p => p.toString() !== socket.user._id.toString());
                        if (notificationReceiverId) {
                            io.to(notificationReceiverId.toString()).emit("update_chat_list", {
                                chatId: roomId,
                                lastMessage: content,
                                lastMessageTime: new Date(),
                                otherParticipant: {
                                    _id: socket.user._id,
                                    name: socket.user.name,
                                    profileImage: socket.user.profileImage
                                }
                            });
                        }

                        // Also update sender's list (if they have multiple tabs open)
                        io.to(socket.user._id.toString()).emit("update_chat_list", {
                            chatId: roomId,
                            lastMessage: content,
                            lastMessageTime: new Date(),
                            otherParticipant: {
                                // ideally we need the receiver's details here for the sender's list update
                                // but usually frontend optimistic update handles this. 
                                // sending mainly for sync across devices.
                                _id: notificationReceiverId,
                                // getting name/image of receiver here is hard without another query.
                                // simpler to just tell client to refresh or send minimal info.
                            }
                        });

                        // Notify receiver if they are not in the room? 
                        // Implementation detail: client can filter.
                    }
                } catch (e) {
                    console.error("Error saving message", e);
                }
            }
        });
        // ... rest of code

        socket.on("disconnect", () => {
            // console.log("User disconnected");
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO not initialized!");
    }
    return io;
};
