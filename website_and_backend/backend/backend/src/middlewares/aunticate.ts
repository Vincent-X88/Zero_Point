import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET || "";

export interface AuthenticatedRequest extends Request {
  user?: { id: number; email: string };
}

const authenticateUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Skip authentication for mobile routes and SMS route.
  if (req.path.startsWith("/api/mobile") || req.path === "/api/sms") {
    console.log("[AUTH] Skipping authentication for mobile route:", req.path);
    return next();
  }

  console.log("[AUTH] Middleware triggered.");
  const authHeader = req.headers.authorization;
  console.log("[AUTH] Authorization Header:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn("[AUTH] No token provided or incorrect format.");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  console.log("[AUTH] Extracted Token:", token);

  try {
    console.log("[AUTH] Verifying token...");
    const decoded = jwt.verify(token, SECRET_KEY) as { userId: number; email: string };
    console.log("[AUTH] Token verified successfully:", decoded);

    req.user = { id: decoded.userId, email: decoded.email };
    console.log("[AUTH] User attached to request:", req.user);

    next();
  } catch (error) {
    console.error("[AUTH] Token verification failed:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
};

export default authenticateUser;
