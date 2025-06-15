import DataURIParser from "datauri/parser.js";
import path from "path";

//Get File from client
//getDataUri(file) this funstion takes an uploaded file
// Converts it into a Base64 string (called a "data URI")
export const getDataUri = (file) => {
  //Creates a new instance of the parser.
  const parser = new DataURIParser();

  //Gets the file extension from the uploaded file's name, like .jpg, .png.
  const extName = path.extname(file.originalname).toString();

  //Converts the uploaded file (in memory as file.buffer) into a data URI.
  return parser.format(extName, file.buffer);
};

// Generate a 6-digit OTP
export const generateRandomOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);
};
