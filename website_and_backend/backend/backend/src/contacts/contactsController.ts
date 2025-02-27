import express, { Request, Response } from 'express';
import pool from '../connection/db';
import authenticateUser, { AuthenticatedRequest } from "../middlewares/aunticate";

const router = express.Router();

/**
 * @route   POST /api/contacts
 * @desc    Add contacts to a device
 * @access  Private (Requires Authentication)
 */
router.post('/', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('DEBUG: /contacts endpoint hit');

    // Extract user ID from token
    const userId = req.user?.id;
    console.log("Extracted userId from token:", userId); 

    
    const { deviceId, contacts } = req.body;

    if (!deviceId || !Array.isArray(contacts)) {
      console.warn('DEBUG: Missing required fields or invalid data');
      return res.status(400).json({ error: 'Invalid request. Ensure deviceId and contacts are provided.' });
    }

    console.log(`DEBUG: Received userId: ${userId}, deviceId: ${deviceId}, contacts: ${JSON.stringify(contacts)}`);

    const query = `
      INSERT INTO sms_contacts_contact (name, phone_number, created_at, device_id, user_id)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `;

    for (const contact of contacts) {
      const { name, phone } = contact;

      if (!name || !phone) {
        console.warn('DEBUG: Skipping invalid contact', contact);
        continue; // Skip invalid contact entries
      }

      await pool.query(query, [name, phone, new Date(), deviceId, userId]);
      console.log(`DEBUG: Contact saved: Name: ${name}, Phone: ${phone}, Device ID: ${deviceId}`);
    }

    res.status(201).json({ message: 'Contacts saved successfully' });
  } catch (error) {
    console.error('DEBUG: Error saving contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /api/contacts
 * @desc    Get contacts by device ID (Only for authenticated user)
 * @access  Private (Requires Authentication)
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Extract user ID from token
    const userId = req.user?.id;
    console.log("Extracted userId from token:", userId); 
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    console.log(`DEBUG: Fetching contacts for userId: ${userId}, deviceId: ${deviceId}`);

    const query = `
      SELECT id, name, phone_number, created_at, device_identifier 
      FROM sms_contacts_contact 
      WHERE device_identifier = $1
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [deviceId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
