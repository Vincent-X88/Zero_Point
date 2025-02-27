import express, { Request, Response } from 'express';
import pool from '../connection/db'; // Adjust the path to match your project structure

const router = express.Router();

/**
 * Endpoint to receive and store WhatsApp messages from the mobile app.
 * POST /mobile/device/:deviceId/whatsapp-messages
 * Body: { recipient: string, messages: [{ message: string, from: string, timestamp: string }] }
 */
router.post('/device/:deviceId/whatsapp-messages', async (req: Request, res: Response) => {
  console.log("Received request to save WhatsApp messages.");
  const { deviceId } = req.params;
  const { recipient, messages } = req.body;

  if (!recipient || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request body. "recipient" must be a string and "messages" must be an array.' });
  }

  try {
    const query = `
      INSERT INTO whatsapp_messages (device_identifier, recipient, message, sender, timestamp)
      VALUES ($1, $2, $3, $4, $5);
    `;

    for (const msg of messages) {
      const values = [deviceId, recipient, msg.message, msg.from, msg.timestamp];
      await pool.query(query, values);
    }

    res.json({ message: "WhatsApp messages saved successfully." });
  } catch (error) {
    console.error('Error saving WhatsApp messages:', error);
    res.status(500).json({ error: 'Failed to save WhatsApp messages.' });
  }
});

export default router;
