import React, { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import axios from "axios";

const API_BASE_URL = "http://172.20.10.2:5000/api"; // Backend API URL
const WS_URL = "ws://172.20.10.2:5001"; // WebSocket URL

const LockDevice = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [socket, setSocket] = useState(null);
  const [isLocking, setIsLocking] = useState(false);
  const [lockSuccess, setLockSuccess] = useState(false);
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/devices`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDevices(response.data);
      } catch (err) {
        console.error("Error fetching devices:", err);
      }
    };

    fetchDevices();
  }, [token]);

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("WebSocket connection established");
      setSocket(ws);
    };

    ws.onclose = (event) => {
      console.warn("WebSocket connection closed:", event.reason);
      setTimeout(() => {
        setSocket(new WebSocket(WS_URL)); // Reconnect WebSocket
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => ws.close();
  }, []);

  const handleDeviceSelect = (event) => {
    setSelectedDeviceId(event.target.value);
    setLockSuccess(false);
  };

  const handleLockDevice = () => {
    if (!selectedDeviceId || !socket || socket.readyState !== WebSocket.OPEN) {
      console.error("No device selected or WebSocket not connected");
      return;
    }

    setIsLocking(true);
    setLockSuccess(false);

    socket.send(JSON.stringify({ action: "lock", deviceId: selectedDeviceId }));

    setTimeout(() => {
      setIsLocking(false);
      setLockSuccess(true);
    }, 2000);
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox mt={6} mb={3}>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} lg={6}>
            <Card>
              <MDBox p={3} textAlign="center">
                <MDTypography variant="h5" fontWeight="bold">
                  Lock Device
                </MDTypography>
                <MDBox mt={2}>
                  <select
                    value={selectedDeviceId}
                    onChange={handleDeviceSelect}
                    style={{
                      width: "100%",
                      padding: "10px",
                      fontSize: "16px",
                      borderRadius: "5px",
                      border: "1px solid #ccc",
                    }}
                  >
                    <option value="">-- Select a Device --</option>
                    {devices.map((device) => (
                      <option key={device.device_identifier} value={device.device_identifier}>
                        {device.name || `Device ${device.device_identifier}`}
                      </option>
                    ))}
                  </select>
                </MDBox>
                <MDBox mt={3}>
                  <MDButton
                    variant="gradient"
                    color="error"
                    fullWidth
                    onClick={handleLockDevice}
                    disabled={!selectedDeviceId || isLocking}
                  >
                    {isLocking ? <CircularProgress size={24} color="inherit" /> : "Lock Device"}
                  </MDButton>
                </MDBox>
                {lockSuccess && (
                  <MDBox mt={2}>
                    <MDTypography variant="body1" color="success">
                      ✅ Lock command sent successfully!
                    </MDTypography>
                  </MDBox>
                )}
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
};

export default LockDevice;
