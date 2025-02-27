// main server file (e.g., index.ts)
import express from 'express';
import cors from 'cors';
import registerRoutes from './src/routes/registerRoutes';
import loginRoutes from './src/routes/login';
import deviceRoutes from './src/routes/lock';
import appBlocker from './src/appRestrictions/appBlocker';
import blockAppsRoutes from './src/routes/blockAppsRoutes';
import LocationRoutes from './src/routes/LocationRoutes';
import Lock from './src/routes/lock';
import authenticateUser from './src/middlewares/aunticate';
import device from "./src/device";
import devicesRouter from './src/device';
import contactsRoutes from './src/contacts/contactsController';
import sms from './src/routes/smsmessages';
import mobileRoutes from './src/mobileRoutes/mobileRoutes';  // Import the mobile routes

const app = express();
app.use(cors());
app.use(express.json());

// Public routes (no authentication needed)
app.use('/api', registerRoutes);
app.use('/api', loginRoutes);

app.use('/api', loginRoutes);

// Public mobile endpoint (no token required)
app.use('/api/mobile', mobileRoutes);
app.use('/api', appBlocker);

// Protected routes (require authentication)
app.use('/api', authenticateUser, deviceRoutes);
app.use('/api/sms', authenticateUser, sms); // Still protected if needed

app.use('/api', authenticateUser, blockAppsRoutes);
app.use('/api', authenticateUser, LocationRoutes);
app.use('/api', authenticateUser, Lock);
app.use('/api', authenticateUser, device);
app.use('/api/devices', authenticateUser, devicesRouter);
app.use('/api/contacts', authenticateUser, contactsRoutes);

const PORT = parseInt(process.env.PORT || '5000', 10);
app.listen(PORT, '172.20.10.2', () => {
  console.log(`Server is running on http://172.20.10.2:${PORT}`);
});
