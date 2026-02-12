import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: false // Chat might exist before booking? For now, let's keep it optional.
    },
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        read: {
            type: Boolean,
            default: false,
        }
    }],
    lastMessage: {
        type: String,
    },
    lastMessageTime: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true,
});

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
