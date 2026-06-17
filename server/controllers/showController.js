import axios from "axios";
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import { inngest } from "../inngest/index.js";

// Cache for TMDB fallback movies
let tmdbFallbackCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

// Function to fetch fallback movies from TMDB API
const getTmdbFallbackMovies = async () => {
  try {
    // Return cached data if not expired
    if (
      tmdbFallbackCache &&
      cacheTimestamp &&
      Date.now() - cacheTimestamp < CACHE_DURATION
    ) {
      return tmdbFallbackCache;
    }

    const { data } = await axios.get(
      "https://api.themoviedb.org/3/movie/now_playing",
      {
        headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        timeout: 5000,
      },
    );

    // Get first 2 movies with valid poster images
    const validMovies =
      data.results
        ?.filter((movie) => movie.poster_path && movie.backdrop_path)
        .slice(0, 2) || [];

    const fallbackMovies = validMovies.map((movie) => ({
      _id: `tmdb_fallback_${movie.id}`,
      title: movie.title,
      overview: movie.overview,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
      release_date: movie.release_date || "",
      original_language: movie.original_language || "en",
      tagline: "",
      genres: movie.genres || [],
      casts: [],
      vote_average: movie.vote_average || 0,
      runtime: 0,
    }));

    // Cache the result
    tmdbFallbackCache = fallbackMovies;
    cacheTimestamp = Date.now();
    return fallbackMovies;
  } catch (error) {
    return [];
  }
};

// API to get now playing movies from TMDB API
export const getNowPlayingMovies = async (req, res) => {
  try {
    const { data } = await axios.get(
      "https://api.themoviedb.org/3/movie/now_playing",
      {
        headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        timeout: 8000,
      },
    );

    const movies = data.results;
    res.json({ success: true, movies: movies });
  } catch (error) {
    // Return fallback movies on error
    const fallbackMovies = await getTmdbFallbackMovies();
    if (fallbackMovies.length > 0) {
      return res.json({ success: true, movies: fallbackMovies });
    }
    res.json({ success: false, message: "Failed to fetch movies" });
  }
};

// API to add a new show to the database
export const addShow = async (req, res) => {
  try {
    const { movieId, showsInput, showPrice } = req.body;

    let movie = await Movie.findById(movieId);

    if (!movie) {
      // Fetch movie details and credits from TMDB API
      const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
        axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        }),

        axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
          headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
        }),
      ]);

      const movieApiData = movieDetailsResponse.data;
      const movieCreditsData = movieCreditsResponse.data;

      const movieDetails = {
        _id: movieId,
        title: movieApiData.title,
        overview: movieApiData.overview,
        poster_path: movieApiData.poster_path,
        backdrop_path: movieApiData.backdrop_path,
        genres: movieApiData.genres,
        casts: movieCreditsData.cast,
        release_date: movieApiData.release_date,
        original_language: movieApiData.original_language,
        tagline: movieApiData.tagline || "",
        vote_average: movieApiData.vote_average,
        runtime: movieApiData.runtime,
      };

      // Add movie to the database
      movie = await Movie.create(movieDetails);
    }

    const showsToCreate = [];
    showsInput.forEach((show) => {
      const showDate = show.date;
      show.time.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`;
        showsToCreate.push({
          movie: movieId,
          showDateTime: new Date(dateTimeString),
          showPrice,
          occupiedSeats: {},
        });
      });
    });

    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }

    //  Trigger Inngest event
    await inngest.send({
      name: "app/show.added",
      data: { movieTitle: movie.title },
    });

    res.json({ success: true, message: "Show Added successfully." });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// API to get all shows from the database
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({ showDateTime: { $gte: new Date() } })
      .populate("movie")
      .sort({ showDateTime: 1 });

    // filter unique shows
    const uniqueShows = new Set(shows.map((show) => show.movie));
    const moviesArray = Array.from(uniqueShows);

    // Ensure minimum 2 movies by fetching from TMDB if needed
    if (moviesArray.length < 2) {
      const neededCount = 2 - moviesArray.length;
      const tmdbMovies = await getTmdbFallbackMovies();

      // Avoid duplicates
      const existingIds = new Set(moviesArray.map((m) => m._id));
      const additionalMovies = tmdbMovies
        .filter((m) => !existingIds.has(m._id))
        .slice(0, neededCount);

      moviesArray.push(...additionalMovies);
    }

    res.json({ success: true, shows: moviesArray });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// API to get a single show from the database
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;
    // get all upcoming shows for the movie
    const shows = await Show.find({
      movie: movieId,
      showDateTime: { $gte: new Date() },
    });

    const movie = await Movie.findById(movieId);
    const dateTime = {};

    shows.forEach((show) => {
      const date = show.showDateTime.toISOString().split("T")[0];
      if (!dateTime[date]) {
        dateTime[date] = [];
      }
      dateTime[date].push({ time: show.showDateTime, showId: show._id });
    });

    res.json({ success: true, movie, dateTime });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
