import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// handling file uploads
const fileFilter = (req, file, cb) => {
  // accept only video files and image files for thumbnail
  if(file.fieldname === "videoFile") {
    if(!file.mimetype.startsWith("video/")) { 
      return cb(new Error("Only video files are allowed."), false);
    }
  }
  if(file.fieldname === "thumbnail") {
    if(!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed for thumbnail."), false);
    }
  }
  cb(null, true);
}

export const upload = multer({
  storage, 
  fileFilter, 
});
