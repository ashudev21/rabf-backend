import express from "express";
import upload from "../utils/multer.js";
import { uploadFile, getUploadAuth } from "../controllers/uploadController.js";

const router = express.Router();

router.post("/", upload.single("image"), uploadFile);
router.get("/auth", getUploadAuth);

export default router;
