// mobileRoutes.ts (or mobileRoutes.js)
import express, { Request, Response } from 'express';
import pool from '../connection/db'; 
const moment = require('moment');

const router = express.Router();

/**
 * Endpoint to save installed apps from the mobile app.
 * POST /mobile/device/:deviceId/apps
 * Body: { apps: [{ packageName: string, timeSpentInForeground: number, lastTimeUsed: number }] }
 */
router.post('/device/:deviceId/apps', async (req: Request, res: Response) => {
  console.log("Received request to save apps from mobile.");
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
      DO UPDATE SET apps = EXCLUDED.apps
      RETURNING *;
    `;
    const values = [deviceId, JSON.stringify(apps)];
    const result = await pool.query(query, values);

    res.json({ message: "Apps saved successfully.", data: result.rows[0] });
  } catch (error) {
    console.error('Error saving apps for device:', error);
    res.status(500).json({ error: 'Failed to save installed apps.' });
  }
});



router.post('/device/:deviceId/whatsapp-messages', async (req: Request, res: Response) => {
  console.log("Received request to save WhatsApp messages.");
  const { deviceId } = req.params;
  const { recipient, messages } = req.body;

  if (!recipient || !Array.isArray(messages)) {
    return res.status(400).json({ 
      error: 'Invalid request body. "recipient" must be a string and "messages" must be an array.' 
    });
  }

  try {
    // Prepare batch insert data
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramCounter = 1;

    messages.forEach((msg, index) => {
      // Validate and format timestamp
      let formattedTimestamp;
      try {
        formattedTimestamp = moment(msg.timestamp, 'DD MMMM YYYY HH:mm').toISOString();
        if (!moment(formattedTimestamp).isValid()) throw new Error('Invalid date');
      } catch (e) {
        console.warn(`Invalid timestamp ${msg.timestamp} at message ${index + 1}`);
        formattedTimestamp = moment().toISOString();
      }

      
      values.push(
        deviceId,
        recipient,
        msg.from,  // 'owner' or 'recipient'
        msg.message,
        formattedTimestamp
      );

      // Build ($1, $2, $3, $4, $5) pattern
      placeholders.push(
        `($${paramCounter}, $${paramCounter + 1}, $${paramCounter + 2}, $${paramCounter + 3}, $${paramCounter + 4})`
      );
      paramCounter += 5;
    });

    // Build final query
    const query = `
      INSERT INTO whatsapp_messages 
        (device_identifier, recipient_name, sender, message, timestamp)
      VALUES ${placeholders.join(', ')}
      RETURNING *;
    `;

    // Execute single batch insert
    const result = await pool.query(query, values);
    
    res.json({
      message: "WhatsApp messages saved successfully.",
      count: result.rowCount
    });
  } catch (error: unknown) {
    console.error('Error saving WhatsApp messages:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    res.status(500).json({ 
      error: 'Failed to save WhatsApp messages.',
      details: errorMessage
    });
  }
});

// GET endpoint to fetch WhatsApp messages for a device
router.get('/device/:deviceId/whatsapp-messages', async (req: Request, res: Response) => {
  
  const { deviceId } = req.params;
  
  try {
    const query = `
      SELECT *
      FROM whatsapp_messages
      WHERE device_identifier = $1
      ORDER BY timestamp ASC;
    `;
    const result = await pool.query(query, [deviceId]);
    
    res.json({ messages: result.rows });
  } catch (error: unknown) {
    console.error('Error fetching WhatsApp messages:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      error: 'Failed to fetch WhatsApp messages.',
      details: errorMessage
    });
  }
});

export default router;

