import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateCurrentUser,
  updateUserAvatar,
  updateUserCoverImage,
  getUserProfile,
  getWatchHistory,
} from "../controllers/user.controller.js";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(upload.none(), loginUser);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);

// refresh token route
router.route("/refresh-token").post(upload.none(), refreshAccessToken);

// change password route
router.route("/change-password").post(verifyJWT, changeCurrentPassword);

// get current user route
router.route("/me").get(verifyJWT, getCurrentUser);

// update current user route
router.route("/update-account").patch(verifyJWT, updateCurrentUser);

// update user avatar route
router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

// update user cover image route
router
  .route("/cover-image")
  .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

// get user profile route
router.route("/profile/:username").get(verifyJWT, getUserProfile);

// get user watch history route
router.route("/history").get(verifyJWT, getWatchHistory);

export default router;
