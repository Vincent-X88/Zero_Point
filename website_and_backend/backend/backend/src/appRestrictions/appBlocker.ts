import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import pool from '../connection/db'; 

const router = express.Router();

// Middleware
router.use(bodyParser.json());
router.use(cors());

/**
 * 1. Fetch linked devices
 * GET /devices
 */
router.get('/devices', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT device_identifier FROM linking_device_linkeddevice');
    res.json(result.rows);
  } catch (error) {
    if (error instanceof Error) {
        console.error('Error fetching devices:', error.message);
        res.status(500).json({ error: 'Failed to fetch linked devices.' });
    } else {
      console.error('Unexpected error:', error);
      res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  }
});

/**
 * 2. Fetch installed apps from a specific device
 * POST /device/:deviceId/apps
 * Body: { apps: [{ packageName: string, appName: string }] }
 */
router.post('/device/:deviceId/apps', async (req: Request, res: Response) => {
    console.log("Received request to save apps.");
    const { deviceId } = req.params;
    const { apps } = req.body;
  
    if (!Array.isArray(apps)) {
      return res.status(400).json({ error: 'Invalid request body. "apps" must be an array.' });
    }
  
    try {
      const query = `
        INSERT INTO device_apps (device_identifier, apps)
        VALUES ($1, $2)
        ON CONFLICT (device_identifier)
        DO UPDATE SET apps = $2
        RETURNING *;
      `;
      const values = [deviceId, JSON.stringify(apps)];
      const result = await pool.query(query, values);
  
      res.json(result.rows[0]);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error saving apps for device:', error.message);
        res.status(500).json({ error: 'Failed to save installed apps.' });
      } else {
        console.error('Unexpected error:', error);
        res.status(500).json({ error: 'An unexpected error occurred.' });
      }
    }
  });
  
/**
 * 3. Block apps on a specific device
 * POST /device/:deviceId/block-apps
 * Body: { blockedApps: [{ packageName: string, timeLimit: number }] }
 */

// Endpoint to fetch apps for a specific device
router.post('/device/:deviceId/device-apps', async (req: Request, res: Response) => {
    console.log('device apps called');
    const { deviceId } = req.params;

    try {
        // Fetch apps for the given device from the database
        const query = `
            SELECT apps FROM device_apps WHERE device_identifier = $1;
        `;
        const values = [deviceId];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Device not found or no apps found for this device.' });
        }

        // Send the apps in the response
        res.json({ apps: result.rows[0].apps });
    } catch (error) {
        console.log('Error fetching apps:', error);
        console.error('Error fetching apps:', error);
        res.status(500).json({ error: 'Failed to fetch apps.' });
    }
});

export default router;
