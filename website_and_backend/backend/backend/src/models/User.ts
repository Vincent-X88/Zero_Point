import pool from '../connection/db';  
import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || '';
const saltRounds = 10;

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: Date;
}

router.post('/api/auth/signup', async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const userCheck = await pool.query(
      'SELECT * FROM user_customeruser WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user with additional fields
    const { rows } = await pool.query<User>(
      `INSERT INTO user_customeruser 
       (first_name, last_name, email, password_hash, is_active, is_staff, is_superuser, date_joined) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, first_name, last_name, email, is_active, date_joined`,
      [
        firstName, 
        lastName, 
        email, 
        hashedPassword,
        true,      // is_active
        false,     // is_staff
        false,     // is_superuser
        new Date() // date_joined
      ]
    );

    const newUser = rows[0];

    // Generate JWT
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        email: newUser.email,
        isActive: newUser.is_active,
        dateJoined: newUser.date_joined
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;