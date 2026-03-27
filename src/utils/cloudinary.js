import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // 🔥 FORCE CONFIG HERE (MOST IMPORTANT FIX)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    console.log("Cloudinary config check:");
    console.log("Cloud:", process.env.CLOUDINARY_CLOUD_NAME);
    console.log("Key:", process.env.CLOUDINARY_API_KEY);

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // delete local file after success
    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    console.log("Cloudinary upload error:", error);

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return null;
  }
};

export { uploadOnCloudinary };
