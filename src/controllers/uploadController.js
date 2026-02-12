import imagekit from "../config/imagekit.js";
import fs from "fs";

// @desc    Upload file to ImageKit
// @route   POST /api/upload
// @access  Public
const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400);
            throw new Error("No file uploaded");
        }

        const fileMatches = req.file.path;
        const fileStream = fs.createReadStream(fileMatches);

        const result = await imagekit.upload({
            file: fileStream,
            fileName: req.file.filename,
        });

        // Delete the file from local storage after upload
        fs.unlinkSync(fileMatches);

        res.json(result.url);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Image upload failed" });
    }
};

export { uploadFile };
