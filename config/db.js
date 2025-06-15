import mongoose from "mongoose";
import colors from "colors";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log(
      `Mongodb Connected ${mongoose.connection.host}`.bgGreen.bold.underline
    );
  } catch (error) {
    console.log(`Mongodb Error ${error}`.bgRed.bold.underline);
  }
};

export default connectDB;
