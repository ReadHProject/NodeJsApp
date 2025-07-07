import multer from "multer";
import path from "path";
import fs from "fs";

//This tells Multer to store uploaded files in memory (RAM) instead of saving them on your computer's hard drive.
//const storage = multer.memoryStorage(); //use to create a temporary storage in a variable

// What below line does is :
// Accepts a single file upload
// The file must come from a form field named "file" (this is important)
// Stores the uploaded file in memory using the memoryStorage() method
// Makes the file available in req.file inside your route

// Define the storage engine
// Storage configuration
// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "uploads", "products");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// Ensure profile upload directory exists
const profileDir = path.join(process.cwd(), "uploads", "profile");
if (!fs.existsSync(profileDir)) {
  fs.mkdirSync(profileDir, { recursive: true });
}

// Multer storage for profile pics
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, profileDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

export const profileUpload = multer({ storage: profileStorage }).single("file");

export const upload = multer({ storage });

export const singleUpload = multer({ storage }).single("file"); // if key value pair is same like storage:storage then we can write it only one time

//multipleUpload
export const multipleUpload = multer({ storage }).any(); // allow up to 10 files, // Increase limit if needed

// | Code Part                | Meaning                                            |
// | ------------------------ | -------------------------------------------------- |
// | `multer.memoryStorage()` | Store file in memory instead of saving to disk     |
// | `.single("file")`        | Accept **one file** from form field named `"file"` |
// | `singleUpload`           | A ready-to-use middleware for file uploads         |
