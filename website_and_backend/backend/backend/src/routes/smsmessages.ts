import express, { Request, Response } from 'express';
import pool from "../connection/db";
import authenticateUser, { AuthenticatedRequest } from "../middlewares/aunticate";

const router = express.Router();

// Save SMS messages
router.post('/', async (req, res) => {
  try {
    const messages = req.body;
    console.debug('Received messages:', messages); 
    if (!Array.isArray(messages)) {
      console.error('Invalid input: Expected array of messages');
      return res.status(400).json({ error: "Expected array of messages" });
    }

    // Validate individual messages
    const isValid = messages.every(msg => 
      msg.sender && msg.message && msg.date && msg.device_identifier
    );
    
    if (!isValid) {
      console.error('Invalid message format detected');
      return res.status(400).json({ error: "Invalid message format" });
    }

    // Prepare values array
    const values = messages.flatMap(msg => [
      msg.sender,
      msg.message,
      new Date(msg.date),
      msg.device_identifier
    ]);
    console.debug('Prepared values for insertion:', values); 

    // Generate placeholders
    const placeholders = messages
      .map((_, i) => `($${i*4+1}, $${i*4+2}, $${i*4+3}, $${i*4+4})`)
      .join(', ');
    console.debug('Generated query placeholders:', placeholders);

    const query = `
      INSERT INTO sms_messages 
        (sender, message, date, device_identifier)
      VALUES ${placeholders}
      RETURNING id
    `;
    console.debug('Generated query:', query); 
    const result = await pool.query(query, values);
    console.debug('Database insert result:', result); 

    res.status(201).json({
      message: `${result.rowCount} messages saved`,
      savedIds: result.rows.map(row => row.id)
    });

  } catch (error) {
    console.error('Error saving messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch SMS messages by device identifier
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deviceId = req.query.deviceId;
    console.debug('Received device ID:', deviceId); // Debug: log the received device ID

    if (!deviceId) {
      console.error('Device ID is missing');
      return res.status(400).json({ error: "Device ID is required" });
    }

    const query = `
      SELECT sender, message, date 
      FROM sms_messages
      WHERE device_identifier = $1
      ORDER BY date DESC
    `;
    console.debug('Generated query for fetching messages:', query); 

    const result = await pool.query(query, [deviceId]);
    console.debug('Database query result for messages:', result);

    if (result.rowCount === 0) {
      console.warn('No messages found for device:', deviceId); 
      return res.status(404).json({ message: "No messages found for this device" });
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
