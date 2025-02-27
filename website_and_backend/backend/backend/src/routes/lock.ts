import express, { Request, Response } from 'express';
import { locationEmitter, connectedDevices } from './websocket';

const router = express.Router();

router.get('/lock/:deviceId', async (req: Request, res: Response) => {
  const { deviceId } = req.params;

  if (!deviceId) {
    return res.status(400).json({
      success: false,
      message: 'Device ID is required',
    });
  }

  const deviceSocket = connectedDevices.get(deviceId);
  if (deviceSocket && deviceSocket.readyState === 1) {
    deviceSocket.send(JSON.stringify({ action: 'lock' }));
    console.log(`Sent locationUpdate command to device ${deviceId}`);
  } else {
    return res.status(404).json({
      success: false,
      message: `Device ${deviceId} is not connected.`,
    });
  }

  
});

export default router;