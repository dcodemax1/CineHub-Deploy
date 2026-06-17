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
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
    });
  } catch (error) {
    console.log("Database connection failed:", error.message);
    throw error;
  }
};

export default connectDB;
