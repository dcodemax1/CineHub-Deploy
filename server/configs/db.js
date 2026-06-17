import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => {
      console.log("Database connected successfully");
    });
    mongoose.connection.on("error", (error) => {
      console.log("Database connection error:", error.message);
    });
    await mongoose.connect(`${process.env.MONGODB_URI}/quickshow`, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
  } catch (error) {
    console.log("Database connection failed:", error.message);
    throw error;
  }
};

export default connectDB;
