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
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/products"),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
export const singleUpload = multer({ storage }).single("file"); // if key value pair is same like storage:storage then we can write it only one time

//multipleUpload
export const multipleUpload = multer({ storage }).array("files", 50); // allow up to 10 files, // Increase limit if needed

// | Code Part                | Meaning                                            |
// | ------------------------ | -------------------------------------------------- |
// | `multer.memoryStorage()` | Store file in memory instead of saving to disk     |
// | `.single("file")`        | Accept **one file** from form field named `"file"` |
// | `singleUpload`           | A ready-to-use middleware for file uploads         |
