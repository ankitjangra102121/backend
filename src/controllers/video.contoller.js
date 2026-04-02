import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { apiResponse } from "../utils/apiResponse.js";
import { generateAccessAndRefreshTokens } from "./user.controller.js";
import Video from "../models/video.model.js";
import jwt from "jsonwebtoken";

// function to upload video files
const uploadVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // validate required fields
  if (!req.files?.videoFile || !req.files?.thumbnail) {
  throw new apiError(400, "Video file and thumbnail are required");
}
  // check for both video file and thumbnail
  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
  if (!videoFileLocalPath && !thumbnailLocalPath) {
    throw new apiError(400, "Both video file and thumbnail are required");
  }
  // upload video file to cloudinary
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile || !thumbnail) {
    throw new apiError(500, "Failed to upload video file and thumbnail");
  }

  // create new video document in the database
  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    owner: req.user._id,
    duration: videoFile.duration,
    public_id: videoFile.public_id,
  });

  // check for successful creation of video document
  if (!video) {
    throw new apiError(500, "Failed to create video");
  }

  return res
    .status(201)
    .json(new apiResponse(201, video, "Video uploaded successfully"));
});


export { uploadVideo };
