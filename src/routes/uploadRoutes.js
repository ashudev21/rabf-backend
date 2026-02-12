import express from "express";
import upload from "../utils/multer.js";
import { uploadFile } from "../controllers/uploadController.js";

const router = express.Router();

router.post("/", upload.single("image"), uploadFile);

export default router;
