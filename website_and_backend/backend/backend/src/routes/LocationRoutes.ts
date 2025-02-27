import express, { Request, Response } from 'express';
import { locationEmitter, connectedDevices } from './websocket';

const router = express.Router();

router.get('/locations/:deviceId', async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  if (!deviceId) {
    return res.status(400).json({
      success: false,
      message: 'Device ID is required',
    });
  }

  const deviceSocket = connectedDevices.get(deviceId);
  if (deviceSocket && deviceSocket.readyState === 1) {
    deviceSocket.send(JSON.stringify({ action: 'locationUpdate' })); // lock
    console.log(`Sent locationUpdate command to device ${deviceId}`);
  } else {
    return res.status(404).json({
      success: false,
      message: `Device ${deviceId} is not connected.`,
    });
  }

  try {
    const location = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for location update')), 5000);
      locationEmitter.once(deviceId, (location) => {
        clearTimeout(timeout);
        resolve(location);
      });
    });

    return res.status(200).json({
      success: true,
      deviceId,
      location,
    });
  } catch (error) {
    console.error((error as Error).message); 
    return res.status(404).json({
      success: false,
      message: `No location found for device: ${deviceId}`,
    });
  }
});

export default router;