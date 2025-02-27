import React, { useState, useEffect } from "react";
import axios from "axios";

// Utility function to decode JWT
const decodeJWT = (token) => {
  try {
    console.log("Decoding JWT token:", token);
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

const AppBlocker = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [apps, setApps] = useState([]);
  const [blockedApps, setBlockedApps] = useState([]);
  const [webSocket, setWebSocket] = useState(null);
  const [loading, setLoading] = useState(false);

  // Retrieve auth token
  const token = localStorage.getItem("authToken");
  console.log("Retrieved token:", token);

  const decodedToken = token ? decodeJWT(token) : null;
  const userId = decodedToken?.userId;
  console.log("Decoded userId:", userId);

  // Fetch devices from the backend
  useEffect(() => {
    if (!userId) {
      console.error("User ID not found in token");
      setError("User ID not found in token");
      return;
    }

    const fetchDevices = async () => {
      console.log("Fetching devices for userId:", userId);
      try {
        setLoading(true);
        const response = await fetch(`http://172.20.10.2:5000/api/devices`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch devices");
        const data = await response.json();
        console.log("Fetched devices:", data);
        setDevices(data);
      } catch (err) {
        console.error("Error fetching devices:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [userId, token]);

  // Fetch installed apps for the selected device
  const fetchApps = async (deviceId) => {
    try {
      console.log(`Fetching apps for device: ${deviceId}`);

      if (!deviceId) {
        console.warn("fetchApps: deviceId is undefined or null");
        return;
      }

      if (!token) {
        console.warn("fetchApps: Authorization token is missing");
        return;
      }

      const response = await axios.post(
        `http://172.20.10.2:5000/api/device/${deviceId}/device-apps`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Response received:", response);
      console.log("Status Code:", response.status);
      console.log("Response Data:", response.data);

      if (response.status !== 200) {
        console.warn(`Unexpected response status: ${response.status}`);
      }

      setApps(response.data.apps || []);
      console.log("Apps successfully updated:", response.data.apps);
    } catch (error) {
      console.error("Error fetching apps:", error);
      if (error.response) {
        console.error("Server Response:", error.response.status, error.response.data);
      } else if (error.request) {
        console.error("No response received from server. Request details:", error.request);
      } else {
        console.error("Unexpected error:", error.message);
      }
    }
  };

  // Handle device selection
  const handleDeviceSelect = (event) => {
    const deviceId = event.target.value;
    setSelectedDevice(deviceId);
    fetchApps(deviceId);

    // Setup WebSocket connection to the selected device
    const ws = new WebSocket(`ws://172.20.10.2:5001?deviceId=${deviceId}`);

    ws.onopen = () => {
      console.log("WebSocket connection established for device:", deviceId);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Message from device:", message);
    };

    ws.onclose = () => {
      console.log(`WebSocket connection closed for device: ${deviceId}`);
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for device ${deviceId}:`, error);
    };

    setWebSocket(ws);
  };

  // Handle app selection for blocking
  const handleAppSelect = (app) => {
    setBlockedApps((prev) => {
      const isSelected = prev.find((blockedApp) => blockedApp.packageName === app.packageName);
      if (isSelected) {
        return prev.filter((blockedApp) => blockedApp.packageName !== app.packageName);
      } else {
        return [...prev, app];
      }
    });
  };

  // Block selected apps
  const blockApps = async () => {
    if (!selectedDevice) {
      alert("Please select a device.");
      return;
    }

    if (blockedApps.length === 0) {
      alert("Please select at least one app to block.");
      return;
    }

    try {
      console.log("Attempting to block apps...");
      console.log("Device:", selectedDevice);
      console.log("Blocked Apps:", blockedApps);
      const url = `http://172.20.10.2:5000/api/device/${selectedDevice}/block-apps`;

      const response = await axios.post(
        url,
        { blockedApps },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Backend response:", response.data);

      if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(
          JSON.stringify({
            action: "block",
            deviceId: selectedDevice,
            apps: blockedApps,
          })
        );
      }

      alert("Apps blocked successfully.");
    } catch (error) {
      console.error("Error blocking apps:", error);
      alert("Failed to block apps.");
    }
  };

  // Unblock selected apps
  const unblockApps = async () => {
    if (!selectedDevice) {
      alert("Please select a device.");
      return;
    }

    if (blockedApps.length === 0) {
      alert("Please select at least one app to unblock.");
      return;
    }

    try {
      console.log("Attempting to unblock apps...");
      console.log("Device:", selectedDevice);
      console.log("Apps to Unblock:", blockedApps);
      const url = `http://172.20.10.2:5000/api/device/${selectedDevice}/unblock-apps`;
      console.log("Sending request to:", url);

      const response = await axios.post(
        url,
        { appsToUnblock: blockedApps },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Backend response:", response.data);

      if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.send(
          JSON.stringify({
            action: "unblock",
            deviceId: selectedDevice,
            apps: blockedApps,
          })
        );
      }

      alert("Apps unblocked successfully.");
    } catch (error) {
      console.error("Error unblocking apps:", error);
      alert("Failed to unblock apps.");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>App Blocker</h1>

      {/* Device selection */}
      <div>
        <label htmlFor="device-select">Select Device:</label>
        <select
          id="device-select"
          onChange={handleDeviceSelect}
          value={selectedDevice || ""}
          style={{ marginLeft: "10px", padding: "5px" }}
        >
          <option value="" disabled>
            -- Select a device --
          </option>
          {devices.map((device) => (
            <option key={device.device_identifier} value={device.device_identifier}>
              {device.device_identifier}
            </option>
          ))}
        </select>
      </div>

      {/* Apps list */}
      {selectedDevice && (
        <div style={{ marginTop: "20px" }}>
          <h2>Installed Apps</h2>
          {apps.length > 0 ? (
            <ul>
              {apps.map((app) => (
                <li key={app.packageName}>
                  <label>
                    <input
                      type="checkbox"
                      checked={
                        !!blockedApps.find(
                          (blockedApp) => blockedApp.packageName === app.packageName
                        )
                      }
                      onChange={() => handleAppSelect(app)}
                    />
                    {app.appName || app.packageName}
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p>No apps found for the selected device.</p>
          )}
        </div>
      )}

      {/* Block and Unblock buttons */}
      {selectedDevice && apps.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <button
            onClick={blockApps}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007BFF",
              color: "#FFF",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            Block Selected Apps
          </button>

          <button
            onClick={unblockApps}
            style={{
              padding: "10px 20px",
              backgroundColor: "#FF5733",
              color: "#FFF",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Unblock Selected Apps
          </button>
        </div>
      )}
    </div>
  );
};

export default AppBlocker;
