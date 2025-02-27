import express from "express";
import pool from "./connection/db";
import authenticateUser, { AuthenticatedRequest } from "./middlewares/aunticate";

const router = express.Router();

router.get("/", authenticateUser, async (req: AuthenticatedRequest, res) => {
  console.log("Received request to /api/devices"); 

  try {
    // Extract user ID from token
    const userId = req.user?.id;
    console.log("Extracted userId from token:", userId); 
    if (!userId) {
      console.warn("Unauthorized access attempt - No userId found in token"); 
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("Fetching devices for userId:", userId); 
    const { rows } = await pool.query(
      "SELECT id, device_name, device_identifier, linked_at FROM linking_device_linkeddevice WHERE user_id = $1",
      [userId]
    );

    console.log("Devices fetched successfully:", rows.length, "devices found"); 
    res.json(rows);
  } catch (error) {
    console.error("Error fetching devices:"); 
    res.status(500).json({ error: "Internal server error"});
  }
});

export default router;
