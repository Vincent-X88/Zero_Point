import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../connection/db';

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-here';
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

router.post('/auth/signup', async (req: Request, res: Response) => {
  try {
    console.log(`DEBUG: Signup endpoint hit with body: ${JSON.stringify(req.body)}`);
    const { firstName, lastName, email, password } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      console.warn('DEBUG: Missing required fields');
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
      console.warn('DEBUG: Password is too short');
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    console.log(`DEBUG: Checking if user already exists with email: ${email}`);
    const userCheck = await pool.query(
      'SELECT * FROM users_customuser WHERE email = $1',
      [email]
    );

    if (userCheck.rows.length > 0) {
      console.warn(`DEBUG: Email ${email} is already registered`);
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    console.log('DEBUG: Hashing password');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    
    console.log(`DEBUG: Inserting new user into the database`);
    const { rows } = await pool.query<User>(
      `INSERT INTO users_customuser 
       (first_name, last_name, email, password, is_active, is_staff, is_superuser, date_joined) 
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
    console.log(`DEBUG: User created with ID: ${newUser.id}`);

    // Generate JWT
    console.log(`DEBUG: Generating JWT for user ID: ${newUser.id}`);
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    console.log(`DEBUG: Registration successful for user ID: ${newUser.id}`);
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
    console.error('DEBUG: Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
