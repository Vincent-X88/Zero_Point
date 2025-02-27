import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";

const API_BASE_URL = "http://172.20.10.2:5000/api";
const WS_URL = "ws://172.20.10.2:5001"; // WebSocket server URL

const DeviceLocation = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  // Get JWT token from localStorage
  const token = localStorage.getItem("authToken");

  // Fetch devices (with JWT authentication)
  useEffect(() => {
    const fetchDevices = async () => {
      if (!token) {
        console.error("No authentication token found.");
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/devices`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch devices");
        const data = await response.json();
        setDevices(data);
      } catch (err) {
        console.error("Error fetching devices:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [token]);

  // Fetch location for the selected device
  const fetchLocation = async (deviceId) => {
    if (!token) {
      console.error("No authentication token found.");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/locations/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` }, // Include JWT token
      });
      const data = response.data;

      if (data.success && data.location) {
        setLocation({
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        });
      } else {
        console.error("Unexpected API response format:", data);
        setLocation(null);
      }
    } catch (error) {
      console.error("Error fetching location:", error);
      setLocation(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle device selection
  const handleDeviceSelect = (event) => {
    const deviceId = event.target.value;
    setSelectedDeviceId(deviceId);

    // WebSocket connection function
    const connectWebSocket = () => {
      const ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        console.log("WebSocket connection established");
        setSocket(ws);
        ws.send(JSON.stringify({ action: "lock", deviceId }));
      };
      ws.onclose = (event) => {
        console.error("WebSocket connection closed:", event.reason);
        setTimeout(connectWebSocket, 5000); // Retry connection after 5 seconds
      };
      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    };

    // Connect to WebSocket if not already connected
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      connectWebSocket();
    } else {
      socket.send(JSON.stringify({ action: "lock", deviceId }));
    }

    // Fetch location for the selected device
    fetchLocation(deviceId);
  };

  // Clean up WebSocket connection when the component unmounts
  useEffect(() => {
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [socket]);

  return (
    <div>
      <h2>Select Device</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <select value={selectedDeviceId} onChange={handleDeviceSelect}>
        <option value="">-- Select a Device --</option>
        {devices.map((device) => (
          <option key={device.device_identifier} value={device.device_identifier}>
            {device.name || `Device ${device.device_identifier}`}
          </option>
        ))}
      </select>

      {location && (
        <MapContainer
          center={[location.latitude, location.longitude]}
          zoom={15}
          style={{ height: "400px", width: "100%", marginTop: "20px" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[location.latitude, location.longitude]}>
            <Popup>Device Location</Popup>
          </Marker>
        </MapContainer>
      )}
    </div>
  );
};

export default DeviceLocation;
