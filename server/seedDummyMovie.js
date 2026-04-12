import mongoose from "mongoose";
import "dotenv/config";
import axios from "axios";
import Movie from "./models/Movie.js";
import Show from "./models/Show.js";

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/quickshow`);
    console.log("✅ Database connected");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

const addDummyMovie = async () => {
  try {
    // Check if dummy movie already exists
    let movie = await Movie.findById("dummy_movie_1");
    if (!movie) {
      let tmdbMovie = null;
      
      // Try to fetch from TMDB with retry
      for (let i = 0; i < 3; i++) {
        try {
          console.log(`Fetching URI movie from TMDB (attempt ${i + 1}/3)...`);
          // Search for the movie first
          const searchResponse = await axios.get('https://api.themoviedb.org/3/search/movie', {
            headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
            params: { query: 'URI The Surgical Strike' },
            timeout: 8000
          });

          if (searchResponse.data.results && searchResponse.data.results.length > 0) {
            const movieId = searchResponse.data.results[0].id;
            console.log(`Found movie with ID: ${movieId}`);
            
            // Now fetch full details
            const detailsResponse = await axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
              headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
              timeout: 8000
            });
            tmdbMovie = detailsResponse.data;
            console.log("✅ TMDB data received");
            break;
          } else {
            throw new Error("Movie not found in search results");
          }
        } catch (error) {
          console.error(`Attempt ${i + 1} failed:`, error.message);
          if (i < 2) await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (!tmdbMovie) {
        throw new Error("Failed to fetch from TMDB after 3 attempts");
      }

      const dummyMovie = {
        _id: "dummy_movie_1",
        title: tmdbMovie.title,
        overview: tmdbMovie.overview,
        poster_path: tmdbMovie.poster_path,
        backdrop_path: tmdbMovie.backdrop_path,
        release_date: tmdbMovie.release_date,
        original_language: tmdbMovie.original_language,
        tagline: tmdbMovie.tagline || "",
        genres: tmdbMovie.genres,
        casts: [],
        vote_average: tmdbMovie.vote_average,
        runtime: tmdbMovie.runtime
      };

      movie = await Movie.create(dummyMovie);
      console.log("✅ Dummy movie added:", movie.title);
    } else {
      console.log("✅ Dummy movie already exists:", movie.title);
    }

    // Create shows for the dummy movie with future dates
    const existingShows = await Show.find({ movie: "dummy_movie_1" });
    if (existingShows.length === 0) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const showsToCreate = [
        {
          movie: "dummy_movie_1",
          showDateTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
          showPrice: 250,
          occupiedSeats: {}
        },
        {
          movie: "dummy_movie_1",
          showDateTime: new Date(new Date(tomorrow).setHours(14, 0, 0, 0)),
          showPrice: 250,
          occupiedSeats: {}
        },
        {
          movie: "dummy_movie_1",
          showDateTime: new Date(new Date(tomorrow).setHours(18, 0, 0, 0)),
          showPrice: 250,
          occupiedSeats: {}
        }
      ];

      await Show.insertMany(showsToCreate);
      console.log("✅ Shows created for dummy movie");
    } else {
      console.log("✅ Shows already exist for dummy movie");
    }
  } catch (error) {
    console.error("❌ Error adding dummy movie:", error.message);
  }
};

const run = async () => {
  await connectDB();
  await addDummyMovie();
  await mongoose.disconnect();
  console.log("✅ Script completed");
  process.exit(0);
};

run();
