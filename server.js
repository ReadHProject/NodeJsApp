import express from "express";
import session from "express-session";
import colors from "colors";
import morgan from "morgan"; //It is a MiddleWare
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cloudinary from "cloudinary";
import Stripe from "stripe";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import mongoSanitize from "express-mongo-sanitize";

import connectDB from "./config/db.js";

//dot env config (must at top of the code after import to work .env file properly)
dotenv.config();

//DB Connection
connectDB();

//Stripe Configuration
export const stripe = new Stripe(process.env.STRIPE_API_SECRET);

//Cloudinary config
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

//Create a rest object (making a copy of express)
const app = express();

// ⬇ Add this to disable caching
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

//Middlewares
app.use(helmet()); // security middleware
app.use(morgan("dev")); // get the API request detail on terminal
app.use(express.json()); //json middleware which express own middleware and use to receive json data
app.use(express.urlencoded({ extended: true })); //urlencoded middleware
app.use(cors()); // for Cross origin support
app.use(cookieParser()); // for cookie parser
// app.use(
//   mongoSanitize({
//     replaceWith: "_", // Replace unsafe characters
//   })
// ); // security middleware

// Setup session for OTP (expires in 5 minutes)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "AdAnky04",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 5 * 60 * 1000, // 5 minutes
      secure: false, // allow cookie on localhost (non-https)
      httpOnly: true,
      sameSite: "lax", // allow from same domain or localhost port
    },
  })
);

app.use(
  cors({
    origin: "http://localhost:8081", // your frontend address
    credentials: true, // allow cookies
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

//Route
//Routes Imports
import testRoutes from "./routes/testRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";

// app.use is use to Run middleware functions for every request or specific routes.
app.use("/api/v1", testRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/order", orderRoutes);

app.get("/", (req, res) => {
  return res.status(200).send("<h1>Weclome to Node Server Ecom APP</h1>");
  //   return res.status(200).json("Weclome to Node Server Ecom APP");
}); //Eg: http://localhost:8080/

//Port
const PORT = process.env.PORT || 8080; //.env file is use to store confidential data like db connection string,APi keys, Ports etx.

//Listen
app.listen(PORT, () => {
  console.log(
    `Server is running on http://localhost:${process.env.PORT} on ${process.env.NODE_ENV} Mode`
      .bgMagenta.white
  );
});
