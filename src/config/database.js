import mongoose from "mongoose";

const DB_URL = "mongodb+srv://vivly:N5tq557SWUeEUy3r@cluster0.fubuasy.mongodb.net/"


const connectDB = async () => {
    try {
        await mongoose.connect(DB_URL);
        console.log("MongoDB connected");
    } catch (error) {
        console.log(error);
    }
}

export default connectDB;