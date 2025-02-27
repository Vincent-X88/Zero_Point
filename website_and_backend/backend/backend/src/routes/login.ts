import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../connection/db';

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || '';

interface User {
  id: number;
  email: string;
  password: string;
  
}

// Sign-in endpoint
router.post('/auth/signin', async (req: Request, res: Response) => {
  try {
    console.log('DEBUG: Sign-in endpoint called');
    const { email, password } = req.body;

    if (!email || !password) {
      console.warn('DEBUG: Missing email or password in request');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log(`DEBUG: Checking for user with email: ${email}`);
    // Fetch user from database
    const { rows } = await pool.query<User>(
      'SELECT * FROM users_customuser WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      console.warn(`DEBUG: No user found with email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    console.log(`DEBUG: User found with ID: ${user.id}`);

    // Compare passwords
    console.log('DEBUG: Comparing passwords');
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.warn('DEBUG: Password comparison failed');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    console.log(`DEBUG: Creating JWT token for user ID: ${user.id}`);
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    console.log(`DEBUG: Sign-in successful for user ID: ${user.id}`);
    res.json({
      message: 'Sign-in successful',
      token,
      user: {
        id: user.id,
        email: user.email,
      }
    });

  } catch (error) {
    console.error('DEBUG: Sign-in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint for linking a device
router.post('/devices/link', async (req: Request, res: Response) => {
  try {
    const { deviceName, deviceIdentifier, userId } = req.body;

    // Validate input fields
    if (!deviceName || !deviceIdentifier || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert device information into the table
    const { rows } = await pool.query(
      `INSERT INTO linked_devices 
        (device_name, device_identifier, linked_at, user_id)
       VALUES ($1, $2, NOW(), $3)
       RETURNING *`,
      [deviceName, deviceIdentifier, userId]
    );

    res.json({
      message: 'Device linked successfully',
      device: rows[0]
    });
  } catch (error) {
    console.error('Device linking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


export default router;
