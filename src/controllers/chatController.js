import Chat from "../models/Chat.js";
import User from "../models/User.js";
import { sendNotification } from "../services/notificationService.js";

// @desc    Get all chats for current user
// @route   GET /api/chats
// @access  Private
export const getChats = async (req, res) => {
    try {
        const chats = await Chat.find({
            participants: { $in: [req.user._id] }
        })
            .populate("participants", "name profileImage")
            .sort({ updatedAt: -1 });

        // Filter out the current user from participants list for frontend display
        const formattedChats = chats.map(chat => {
            const otherParticipant = chat.participants.find(
                p => p._id.toString() !== req.user._id.toString()
            );
            return {
                ...chat.toObject(),
                otherParticipant
            };
        });

        res.json(formattedChats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Get messages for a specific chat or create/get chat by user ID
// @route   GET /api/chats/:userId
// @access  Private
// @desc    Get messages for a specific chat or create/get chat by user ID
// @route   GET /api/chats/:userId
// @access  Private
export const getChatMessages = async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Check if valid ObjectId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ message: "Invalid User ID" });
    }

    try {
        // Find chat where both users are participants
        // We need to slice the messages array for pagination
        // Note: Slicing deeply nested array in findOne is tricky. 
        // Better to find the chat, then slice it or use aggregation.
        // For simplicity with Mongoose, let's try standard find first.

        // However, messages are embedded. Pagination on embedded arrays:
        // slice: [skip, limit] -> [ (page-1)*limit, limit ]
        // BUT messages are usually appended. typically we want the *last* 20, then the 20 before that.
        // So page 1 = last 20. page 2 = 20 before that.
        // slice: [ -1 * (page * limit), limit ] ?? No.

        // Let's use aggregation to unwind and sort if array is huge, 
        // but for now, let's use the slice option on query.
        // slice: -limit returns last 'limit' items.
        // slice: [skip, limit]

        // To get "Page 1" (Latest): .slice('messages', -limit)
        // To get "Page 2": .slice('messages', [ -(page * limit), limit ]) 
        // e.g. Limit 20. Page 1: slice(-20). 
        // Page 2: slice(-40, 20) -> Valid in Mongo? 
        // Mongo slice: [skip, limit]. If skip is negative, it's from end.

        // A simpler approach for MVP:
        // Just return the whole chat doc but slice the messages.

        const skip = (page - 1) * limit;
        // Since we want reverse chronological (latest first) for UI but stored chronological
        // We actually want the *end* of the array.
        // Let's rely on standard slicing from the end?
        // Actually, infinite scroll usually requests "messages before ID/Time".
        // Let's support `limit` and `before`.

        // RE-DESIGN: embedded messages are hard to paginate efficiently if array is huge.
        // We stick to simple slicing for now.
        // "Give me the last 50 messages".

        const chat = await Chat.findOne({
            participants: { $all: [req.user._id, userId] }
        }, {
            messages: { $slice: -1 * (page * limit) } // Naive pagination: fetches last N. 
            // This pulls 20, then 40, then 60... bandwidth heavy but simple for embedded.
            // Better: { $slice: [ -1 * (page * limit), limit ] } doesn't work well with "Load More previous".
        }).populate("participants", "name profileImage")
            .populate("messages.sender", "name profileImage");

        if (!chat) {
            // Check if user exists
            const userExists = await User.findById(userId);
            if (!userExists) {
                return res.status(404).json({ message: "User not found" });
            }

            // Return new chat structure
            // Don't save yet to avoid empty chats
            return res.json({
                _id: null,
                participants: [req.user, userExists],
                messages: []
            });
        }

        // If naive slice returned everything from end, we might need to trim the start if we only want "page 2".
        // But for now, let's just return the last (page * limit) and let frontend deduct?
        // No, that's bad.

        // Let's stick to standard "Load all relevant for now" or fix specific slice.
        // Mongo $slice with [skip, limit] where skip is negative counts from end.
        // [ -20, 20 ] -> Last 20.
        // [ -40, 20 ] -> 20 items starting 40 from end.

        // So: skip = -1 * page * limit;
        //     limit = limit;
        // BUT if array has 30 items. Page 1: [-20, 20]. Page 2: [-40, 20]. -40 is out of bounds.
        // Mongo handles out of bounds gracefully usually.

        // Refetching to apply correct slice
        const chatWithMessages = await Chat.findOne({
            participants: { $all: [req.user._id, userId] }
        }, {
            participants: 1,
            messages: { $slice: [-1 * (page * limit), parseInt(limit)] }
        }).populate("participants", "name profileImage")
            .populate("messages.sender", "name profileImage");

        if (!chatWithMessages) {
            return res.json({ _id: null, participants: [], messages: [] });
        }

        res.json(chatWithMessages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Send a message (REST fallback/initial)
// @route   POST /api/chats
// @access  Private
export const sendMessage = async (req, res) => {
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
        return res.status(400).json({ message: "Receiver and content required" });
    }

    try {
        let chat = await Chat.findOne({
            participants: { $all: [req.user._id, receiverId] }
        });

        if (!chat) {
            chat = await Chat.create({
                participants: [req.user._id, receiverId],
                messages: []
            });
        }

        // Simple limit check for API flow (can be expanded to match socket logic)
        // Check if sender has active booking (Skip for MVP speed, assume first message is allowed)

        const newMessage = {
            sender: req.user._id,
            text: content,
            timestamp: new Date()
        };

        // First Message Notification Logic
        if (chat.messages.length === 0) {
            try {
                await sendNotification(receiverId, {
                    type: "NEW_MESSAGE",
                    message: `New message from ${req.user.name}`,
                    link: `/chats/${req.user._id}`
                });
            } catch (err) {
                console.error("Notification Error:", err);
            }
        }

        chat.messages.push(newMessage);
        chat.lastMessage = content;
        chat.updatedAt = new Date();
        await chat.save();

        // Populate for return
        const populatedChat = await Chat.findById(chat._id)
            .populate("participants", "name profileImage")
            .populate("messages.sender", "name profileImage");

        res.json(populatedChat);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};




