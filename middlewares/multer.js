import multer from "multer";

//This tells Multer to store uploaded files in memory (RAM) instead of saving them on your computer's hard drive.
const storage = multer.memoryStorage(); //use to create a temporary storage in a variable

// What below line does is :
// Accepts a single file upload
// The file must come from a form field named "file" (this is important)
// Stores the uploaded file in memory using the memoryStorage() method
// Makes the file available in req.file inside your route
export const singleUpload = multer({ storage }).single("file"); // if key value pair is same like storage:storage then we can write it only one time

// | Code Part                | Meaning                                            |
// | ------------------------ | -------------------------------------------------- |
// | `multer.memoryStorage()` | Store file in memory instead of saving to disk     |
// | `.single("file")`        | Accept **one file** from form field named `"file"` |
// | `singleUpload`           | A ready-to-use middleware for file uploads         |
