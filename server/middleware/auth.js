import { clerkClient } from "@clerk/express";
import jwt from "jsonwebtoken";

// Helper function to extract userId from Bearer token
export const getUserIdFromToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const decoded = jwt.decode(token);

  return decoded?.sub;
};

export const protectAdmin = async (req, res, next) => {
  try {
    const userId = getUserIdFromToken(req);

    if (!userId) {
      return res.json({ success: false, message: "No authorization token" });
    }

    // Get user from Clerk
    const user = await clerkClient.users.getUser(userId);

    if (user.privateMetadata?.role !== "admin") {
      return res.json({ success: false, message: "not authorized" });
    }

    next();
  } catch (error) {
    return res.json({ success: false, message: "not authorized" });
  }
};
