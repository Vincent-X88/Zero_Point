import { Pool } from 'pg';

const pool = new Pool({
  user: '',
  host: '',
  database: '',
  password: '',
  port: ,
});

const testDatabaseConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connected successfully:', result.rows[0]);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Database connection failed:', error.message);
    } else {
      console.error('Unexpected error occurred while connecting to the database.');
    }
  }
};

testDatabaseConnection();

export default pool;
