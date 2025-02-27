import express from 'express';
import { connectedDevices } from './websocket';

const router = express.Router();

// Define the types for the apps
interface App {
  packageName: string;
  appName: string;
}

// In-memory storage for blocked apps per device
const blockedAppsPerDevice = new Map<string, App[]>();

// Route to block apps
router.post('/device/:deviceId/block-apps', (req, res) => {
    const { deviceId } = req.params;
    const { blockedApps }: { blockedApps: App[] } = req.body;
  
    
    console.log(`Received request to block apps for device ${deviceId}`);
    console.log('Blocked Apps:', blockedApps);
  
    if (!Array.isArray(blockedApps) || !deviceId) {
      console.error('Invalid request data:', req.body);
      return res.status(400).json({ error: 'Invalid request data.' });
    }
  
    const existingBlockedApps = blockedAppsPerDevice.get(deviceId) || [];
    const updatedBlockedApps = [
      ...existingBlockedApps,
      ...blockedApps.filter(
        (app) => !existingBlockedApps.find((blocked) => blocked.packageName === app.packageName)
      ),
    ];
  
    blockedAppsPerDevice.set(deviceId, updatedBlockedApps);
  
    console.log(`Updated blocked apps for device ${deviceId}:`, updatedBlockedApps);
  
    // Send block command to device via WebSocket
    const deviceSocket = connectedDevices.get(deviceId);
    if (deviceSocket && deviceSocket.readyState === 1) {
      deviceSocket.send(
        JSON.stringify({
          action: 'block',
          apps: blockedApps,
        })
      );
      console.log(`Sent block command to device ${deviceId}`);
    } else {
      console.error(`Device ${deviceId} not connected.`);
      return res.status(404).json({ error: 'Device not connected.' });
    }
  
    res.json({ success: true, blockedApps: updatedBlockedApps });
  });
  
  // Route to unblock apps
  router.post('/device/:deviceId/unblock-apps', (req, res) => {
    const { deviceId } = req.params;
    const { appsToUnblock }: { appsToUnblock: App[] } = req.body;
  
    
    console.log(`Received request to unblock apps for device ${deviceId}`);
    console.log('Apps to Unblock:', appsToUnblock);
  
    if (!Array.isArray(appsToUnblock) || !deviceId) {
      console.error('Invalid request data:', req.body);
      return res.status(400).json({ error: 'Invalid request data.' });
    }
  
    const existingBlockedApps = blockedAppsPerDevice.get(deviceId) || [];
    const updatedBlockedApps = existingBlockedApps.filter(
      (app) => !appsToUnblock.find((unblock) => unblock.packageName === app.packageName)
    );
  
    blockedAppsPerDevice.set(deviceId, updatedBlockedApps);
  
    
    console.log(`Updated blocked apps for device ${deviceId}:`, updatedBlockedApps);
  
    
    const deviceSocket = connectedDevices.get(deviceId);
    if (deviceSocket && deviceSocket.readyState === 1) {
      deviceSocket.send(
        JSON.stringify({
          action: 'unblock',
          apps: appsToUnblock,
        })
      );
      console.log(`Sent unblock command to device ${deviceId}`);
    } else {
      console.error(`Device ${deviceId} not connected.`);
      return res.status(404).json({ error: 'Device not connected.' });
    }
  
    res.json({ success: true, updatedBlockedApps });
  });
  

// Route to fetch currently blocked apps
router.get('/api/device/:deviceId/blocked-apps', (req, res) => {
  const { deviceId } = req.params;
  const blockedApps = blockedAppsPerDevice.get(deviceId) || [];
  res.json({ blockedApps });
});

export default router;
