import { clerkClient } from "@clerk/express";
import jwt from "jsonwebtoken";

// Helper function to extract userId from Bearer token
export const getUserIdFromToken = (req) => {
  const authHeader = req.headers.authorization;
  console.log("🔍 getUserIdFromToken - Auth header exists?:", !!authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("❌ getUserIdFromToken - No Bearer token in header");
    return null;
  }

  const token = authHeader.substring(7);
  console.log(
    "🔍 getUserIdFromToken - Token extracted:",
    token.substring(0, 30) + "...",
  );

  const decoded = jwt.decode(token);
  console.log(
    "🔍 getUserIdFromToken - Decoded token:",
    JSON.stringify(decoded, null, 2),
  );
  console.log("🔍 getUserIdFromToken - userId (sub):", decoded?.sub);

  return decoded?.sub;
};

export const protectAdmin = async (req, res, next) => {
  try {
    const userId = getUserIdFromToken(req);
    console.log("🔍 Admin Check - userId from JWT:", userId);

    if (!userId) {
      console.log("❌ No userId found");
      return res.json({ success: false, message: "No authorization token" });
    }

    // Get user from Clerk
    const user = await clerkClient.users.getUser(userId);
    console.log("🔍 User found:", user.emailAddresses[0].emailAddress);
    console.log(
      "🔍 FULL Private Metadata object:",
      JSON.stringify(user.privateMetadata, null, 2),
    );
    console.log("🔍 Role property type:", typeof user.privateMetadata?.role);
    console.log("🔍 Role value:", JSON.stringify(user.privateMetadata?.role));
    console.log(
      "🔍 Comparison result:",
      user.privateMetadata?.role === "admin",
    );

    // Try different comparisons
    const roleValue = user.privateMetadata?.role;
    console.log('🔍 Role is "admin"?:', roleValue === "admin");
    console.log(
      '🔍 Role toLowerCase is "admin"?:',
      roleValue?.toLowerCase() === "admin",
    );
    console.log('🔍 Role includes "admin"?:', roleValue?.includes?.("admin"));

    if (user.privateMetadata?.role !== "admin") {
      console.log(
        "❌ Not admin - access denied. Role:",
        user.privateMetadata?.role,
      );
      return res.json({ success: false, message: "not authorized" });
    }

    console.log("✅ Admin verified - access granted");
    next();
  } catch (error) {
    console.log("❌ Error in protectAdmin:", error.message);
    console.log("❌ Error stack:", error.stack);
    return res.json({ success: false, message: "not authorized" });
  }
};
