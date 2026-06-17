import mongoose from "mongoose";
import "dotenv/config";
import Movie from "./models/Movie.js";
import Show from "./models/Show.js";

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/quickshow`);
  } catch (error) {
    process.exit(1);
  }
};

const cleanup = async () => {
  try {
    await Movie.deleteOne({ _id: "dummy_movie_1" });
    await Show.deleteMany({ movie: "dummy_movie_1" });
  } catch (error) {}
};

const run = async () => {
  await connectDB();
  await cleanup();
  await mongoose.disconnect();
  process.exit(0);
};

run();
