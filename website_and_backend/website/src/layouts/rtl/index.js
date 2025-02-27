import React, { useState, useEffect } from "react";
import axios from "axios";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDSnackbar from "components/MDSnackbar";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

const API_BASE_URL = "http://172.20.10.2:5000/api";
const WS_URL = "ws://172.20.10.2:5001";

// Utility function to decode JWT
const decodeJWT = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
};

const DeviceLocation = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [locations, setLocations] = useState([]);
  const [socket, setSocket] = useState(null);
  const token = localStorage.getItem("authToken");

  const decodedToken = token ? decodeJWT(token) : null;
  const userId = decodedToken?.userId;

  // Notification states
  const [notification, setNotification] = useState({
    open: false,
    color: "info",
    message: "",
  });

  const showNotification = (color, message) => {
    setNotification({ open: true, color, message });
  };

  const closeNotification = () => setNotification({ ...notification, open: false });

  useEffect(() => {
    const fetchDevices = async () => {
      if (!token) {
        showNotification("error", "No authentication token found.");
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/devices`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("Fetched Devices:", response.data);
        setDevices(response.data);

        if (response.data.length === 0) {
          showNotification("warning", "No devices found.");
        } else {
          showNotification("success", "Devices loaded successfully.");
        }
      } catch (err) {
        console.error("Error fetching devices:", err.message);
        showNotification("error", "Error fetching devices.");
      }
    };

    fetchDevices();
  }, [token]);

  // Fetch locations for a specific device
  const fetchLocations = async (deviceId) => {
    if (!token || !userId) {
      showNotification("error", "Authentication required to fetch locations.");
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/locations/${deviceId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-ID": userId,
        },
      });

      const data = response.data;
      if (data.success && data.location) {
        setLocations([
          {
            device_identifier: data.deviceId,
            latitude: data.location.latitude,
            longitude: data.location.longitude,
          },
        ]);
      } else {
        console.error("Unexpected API response format:", data);
        setLocations([]);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocations([]);
    }
  };

  // Handle device selection
  const handleDeviceSelect = (event) => {
    const deviceId = event.target.value;
    setSelectedDeviceId(deviceId);
    fetchLocations(deviceId);

    // Notify WebSocket server
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ action: "locationUpdate", deviceId }));
    }
  };

  // WebSocket setup
  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.action === "locationUpdate" && data.deviceId === selectedDeviceId) {
          setLocations([
            {
              device_identifier: data.deviceId,
              latitude: data.latitude,
              longitude: data.longitude,
            },
          ]);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = () => console.log("WebSocket disconnected");
    ws.onerror = (error) => console.error("WebSocket error:", error);

    return () => {
      ws.close();
    };
  }, [selectedDeviceId]);

  const selectedLocation = locations.find(
    (location) => location.device_identifier === selectedDeviceId
  );

  return (
    <DashboardLayout>
      <DashboardNavbar />

      {/* Device Selection */}
      <MDBox mt={3} mb={3}>
        <MDTypography variant="h6">Select a Device</MDTypography>
        <select value={selectedDeviceId} onChange={handleDeviceSelect}>
          <option value="">-- Select a Device --</option>
          {devices.length > 0 ? (
            devices.map((device, index) => {
              console.log(`Rendering device ${index}:`, device);
              return (
                <option key={device.device_identifier} value={device.device_identifier}>
                  {device.name || `Device ${device.device_identifier}`}{" "}
                  {/* Fallback in case name is missing */}
                </option>
              );
            })
          ) : (
            <option disabled>No devices available</option>
          )}
        </select>
      </MDBox>

      {/* Map Display */}
      <MDBox mt={4} style={{ height: "500px" }}>
        <MapContainer
          center={
            selectedLocation ? [selectedLocation.latitude, selectedLocation.longitude] : [0, 0]
          }
          zoom={selectedLocation ? 13 : 2}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
          />
          {selectedLocation && (
            <Marker position={[selectedLocation.latitude, selectedLocation.longitude]}>
              <Popup>
                <strong>Device:</strong> {selectedLocation.device_identifier} <br />
                <strong>Latitude:</strong> {selectedLocation.latitude} <br />
                <strong>Longitude:</strong> {selectedLocation.longitude}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </MDBox>

      {/* Notifications */}
      <MDSnackbar
        color={notification.color}
        icon="notifications"
        title="Device Tracker"
        content={notification.message}
        open={notification.open}
        onClose={closeNotification}
        close={closeNotification}
      />

      <Footer />
    </DashboardLayout>
  );
};

export default DeviceLocation;
