import DataURIParser from "datauri/parser.js";
import path from "path";
import fs from "fs";

//Get File from client
//getDataUri(file) this funstion takes an uploaded file
// Converts it into a Base64 string (called a "data URI")
export const getDataUri = (file) => {
  //Creates a new instance of the parser.
  const parser = new DataURIParser();

  //Gets the file extension from the uploaded file's name, like .jpg, .png.
  const extName = path.extname(file.originalname).toString();

  // Check if file has buffer (memory storage) or path (disk storage)
  if (file.buffer) {
    // Memory storage - use buffer directly
    return parser.format(extName, file.buffer);
  } else if (file.path) {
    // Disk storage - read file from path
    try {
      const fileBuffer = fs.readFileSync(file.path);
      return parser.format(extName, fileBuffer);
    } catch (error) {
      throw new Error(`Failed to read file from path: ${file.path}. Error: ${error.message}`);
    }
  } else {
    throw new Error('File object must have either buffer (memory storage) or path (disk storage)');
  }
};

// Generate a 6-digit OTP
export const generateRandomOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);
};
