import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
export const locationEmitter = new EventEmitter();

// Define the WebSocket server
const wss = new WebSocketServer({ host: '172.20.10.2', port: 5001 });
const connectedDevices = new Map<string, WebSocket>();

// Store device locations
const deviceLocations: Record<string, { latitude: number; longitude: number }> = {};

wss.on('connection', (ws: WebSocket, req: any) => {
  // Parse URL and get deviceId from query parameter
  const url = req.url ?? '';
  const urlParams = new URLSearchParams(url.substring(1)); 
  const deviceId = urlParams.get('deviceId');
  const clientType = urlParams.get('client');

  if (!deviceId) {
    console.error('No device ID provided!');
    ws.close();
    return;
  }

  if (clientType !== 'mobile') {
    console.warn(`Ignoring connection from non-mobile client. deviceId: ${deviceId}, client: ${clientType}`);
    ws.close();
    return;
  }

  // Register the device
  connectedDevices.set(deviceId, ws);
  console.log(`Device connected and registered: ${deviceId}`);

  // Handle incoming messages from the device
  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      const { action, apps, deviceId: receivedDeviceId, location } = data;
      console.log(`Received message from device ${receivedDeviceId}:`, data);

      if (action === 'block' && receivedDeviceId && apps) {
        const deviceSocket = connectedDevices.get(receivedDeviceId);
        if (deviceSocket && deviceSocket.readyState === WebSocket.OPEN) {
          deviceSocket.send(JSON.stringify({ action: 'block', apps }));
          console.log(`Sent block command to device ${receivedDeviceId}:`, apps);
        } else {
          console.warn(`Device not connected: ${receivedDeviceId}`);
        }
      } else if (action === "locationUpdate" && location) {
        deviceLocations[deviceId] = location;
        console.log(`Updated location for ${deviceId}:`, location);
        locationEmitter.emit(deviceId, location);
      } else if (action === 'lock') {
        console.log(`Lock command received for device ${receivedDeviceId}`);
        const deviceSocket = connectedDevices.get(receivedDeviceId);
        if (deviceSocket) {
          deviceSocket.send(JSON.stringify({ action: 'lock' }));
          console.log(`Sent lock command to device ${receivedDeviceId}`);
        } else {
          console.warn(`Device not connected: ${receivedDeviceId}`);
        }
      } else {
        console.warn('Invalid message format or missing required fields:', data);
      }
    } catch (err) {
      console.error('Error processing WebSocket message:', err);
    }
  });

  // Handle connection close
  ws.on('close', () => {
    connectedDevices.delete(deviceId);
    console.log(`Device disconnected: ${deviceId}`);
  });

  // Handle errors
  ws.on('error', (err: Error) => {
    console.error('WebSocket error:', err);
  });
});

export { wss, connectedDevices, deviceLocations };
