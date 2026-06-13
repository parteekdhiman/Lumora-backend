import express from "express";
import multer from "multer";
import { uploadResume, getResume, deleteResume, analyzeResume } from "./application.controller.js";
import { protect, jobseekerOnly } from "../../shared/middleware/auth.middleware.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDFs are allowed."), false);
    }
  },
});

router.post("/upload", protect, jobseekerOnly, upload.single("resume"), uploadResume);
router.get("/me", protect, jobseekerOnly, getResume);
router.delete("/delete", protect, jobseekerOnly, deleteResume);
router.post("/analyze", protect, jobseekerOnly, analyzeResume);

export default router;
