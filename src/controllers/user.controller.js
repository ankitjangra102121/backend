import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

//function to generate access token and refresh token
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    // find user in db
    const user = await User.findById(userId);

    if (!user) {
      throw new apiError(404, "User not found");
    }
    // generate access token and refresh token
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    // save refresh token in db
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log("TOKEN ERROR:", error);
    throw new apiError(500, error.message);
  }
};

//register user controller
const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  const { fullName, email, username, password } = req.body || {};

  // validation - not empty
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new apiError(400, "All fields are required");
  }

  // check if user already exists - username, email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new apiError(409, "User with email or username already existed.");
  }

  // check for images, check for avatar
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is required.");
  }

  // upload them to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  if (!avatar) {
    throw new apiError(400, "Avatar file is missing.");
  }

  // create user object - create entry in db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser) {
    throw new apiError(500, "Something went wrong while registering the user.");
  }

  // return response
  return res
    .status(201)
    .json(new apiResponse(201, createdUser, "User registered successfully."));
});

// login user controller
const loginUser = asyncHandler(async (req, res) => {
  // get data from frontend
  const { username, email, password } = req.body || {};

  // validation of username or email
  if (!username && !email) {
    throw new apiError(400, "Username or email is required for login.");
  }
  // check if user exists
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new apiError(
      404,
      "User does not exist with the provided username or email."
    );
  }

  // check password is correct or not
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new apiError(401, "Invalid password. Please try again.");
  }

  // generate access token and refresh token
  const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // send cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  // return response
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully."
      )
    );
});

// logout user controller
const logoutUser = asyncHandler(async (req, res) => {
  // remove refresh token from db
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  // clear cookies
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
  // return response
  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new apiResponse(200, {}, "User logged out successfully."));
});

// refresh access token controller
const refreshAccessToken = asyncHandler(async (req, res) => {
  // get refresh token from cookies or request body
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  // validate refresh token
  if (!incomingRefreshToken) {
    throw new apiError(401, "unauthorized request");
  }
  // verify token and get user data from it
  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );
  // find user in db and check if refresh token is same as token in db
  const user = await User.findById(decodedToken?._id);
  // if user not found or refresh token is not same then throw error
  if (!user || user?.refreshToken !== incomingRefreshToken) {
    throw new apiError(401, "unauthorized request");
  }
  // generate new access token
  const accessToken = user.generateAccessToken(user._id);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
  // return response with new access token
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(
      new apiResponse(
        200,
        { accessToken },
        "Access token refreshed successfully."
      )
    );
});

// change current password controller
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  // 1. validate old password and new password
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  // 2. check old password is correct or not
  if (!isPasswordCorrect) {
    throw new apiError(404, "User not found.");
  }
  // 3. if correct then update new password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  // 4. return response
  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password changed successfully."));
});

// get current user controller
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new apiResponse(200, req.user, "Current user fetched successfully."));
});

// update current user controller
const updateCurrentUser = asyncHandler(async (req, res) => {
  // get data from frontend
  const { fullName, email, username } = req.body;
  // validation - at least one field is required
  if (!fullName && !email && !username) {
    throw new apiError(400, "At least one field is required to update.");
  }
  // find user in db and update
  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
        username: username,
      },
    },
    { new: true }
  ).select("-password -refreshToken");
  // check if user is found and updated
  if (!user) {
    throw new apiError(404, "User not found.");
  }

  // return response
  return res
    .status(200)
    .json(new apiResponse(200, user, "User updated successfully."));
});

// update user avatar controller
const updateUserAvatar = asyncHandler(async (req, res) => {
  // 1. check for avatar file in request
  const avatarLocalPath = req.file?.path;

  // 2. if avatar file is not present then throw error
  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is required.");
  }

  // 3. if present then upload it on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  // 4. if avatar is not uploaded successfully then throw error
  if (!avatar.url) {
    throw new apiError(500, "Something went wrong while uploading avatar.");
  }

  // 5. if uploaded successfully then update user avatar in db
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new apiError(404, "User not found.");
  }

  // 6. return response with updated avatar url
  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { avatar: user.avatar },
        "User avatar updated successfully."
      )
    );
});
// update user cover image controller
const updateUserCoverImage = asyncHandler(async (req, res) => {
  // 1. check for cover image file in request
  const CoverImageLocalPath = req.file?.path;

  // 2. if cover image file is not present then throw error
  if (!CoverImageLocalPath) {
    throw new apiError(400, "Cover image file is required.");
  }

  // 3. if present then upload it on cloudinary
  const CoverImage = await uploadOnCloudinary(CoverImageLocalPath);

  // 4. if cover image is not uploaded successfully then throw error
  if (!CoverImage.url) {
    throw new apiError(
      500,
      "Something went wrong while uploading cover image."
    );
  }

  // 5. if uploaded successfully then update user cover image in db
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: CoverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new apiError(404, "User not found.");
  }

  // 7. return response with updated cover image url
  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { coverImage: user.coverImage },
        "User cover image updated successfully."
      )
    );
});

// get user profile controller
const getUserProfile = asyncHandler(async (req, res) => {
  // get username from request params
  const { username } = req.params;

  // validate username
  if (!username?.trim()) {
    throw new apiError(400, "Username is required.");
  }
  // find user by username and get profile details along with subscribers count, subscribed channels count and isSubscribed (if current logged in user is subscribed to that channel or not)
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedChannels",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedChannelsCount: {
          $size: "$subscribedChannels",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        subscribedChannelsCount: 1,
        isSubscribed: 1,
      },
    },
  ]);

  // if user not found then throw error
  if (!channel?.length) {
    throw new apiError(404, "User not found.");
  }

  // return response with user profile details
  return res
    .status(200)
    .json(
      new apiResponse(200, channel[0], "User profile fetched successfully.")
    );
});

// get watch history controller
const getWatchHistory = asyncHandler(async (req, res) => {
  // find user by id and get watch history videos with pagination (page number and limit)
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.objectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  // return response with watch history videos and pagination details
  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        user[0].getWatchHistory,
        "User watch history fetched successfully."
      )
    );
});

export {
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
  generateAccessAndRefreshTokens,
};
