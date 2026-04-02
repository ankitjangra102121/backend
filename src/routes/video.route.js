import { Router } from "express";
import {
  uploadVideo,
  getVideoById,
  getAllVideos,
  updateVideo,
  deleteVideo,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

// Upload a new video
router.route("/upload").post(verifyJWT, upload.single("video"), uploadVideo);
// Get video by ID
router.route("/:id").get(getVideoById);
// Get all videos
router.route("/").get(getAllVideos);
// Update video details
router.route("/:id").patch(verifyJWT, updateVideo);
// Delete a video
router.route("/:id").delete(verifyJWT, deleteVideo);
export default router;
