import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

//USER AUTH
export const isAuth = async (req, res, next) => {
  try {
    // Check for token in Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Extract token from "Bearer [token]"
      token = authHeader.split(" ")[1];
    } else {
      // Fallback to cookie for backward compatibility
      token = req.cookies.token;
    }

    //Validation
    if (!token || token == undefined) {
      return res.status(401).send({
        success: false,
        message: "UnAuthorized User",
      });
    }
    const decodeData = JWT.verify(token, process.env.JWT_SECRET);
    req.user = await userModel.findById(decodeData._id);
    // console.log(req.user);
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Auth Middleware ${error}`,
      error,
    });
  }
};

//ADMIN AUTH
export const isAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(401).send({
        success: false,
        message: "UnAuthorized Access...Admin Only",
      });
    }
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: `Error in Admin Middleware ${error}`,
      error,
    });
  }
};
