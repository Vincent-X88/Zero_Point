import React, { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Utility function to decode JWT
const decodeJWT = (token) => {
  try {
    console.log("Decoding JWT token:", token);
    const base64Url = token.split(".")[1]; // Get the payload part of the token
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

function Sms() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Retrieve auth token
  const token = localStorage.getItem("authToken");
  console.log("Retrieved token:", token);

  const decodedToken = token ? decodeJWT(token) : null;
  const userId = decodedToken?.userId;
  console.log("Decoded userId:", userId);

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

  // Fetch messages when a device is selected
  useEffect(() => {
    if (!selectedDevice) return;

    console.log("useEffect triggered for selectedDevice:", selectedDevice);
    const fetchMessages = async () => {
      if (!selectedDevice) {
        console.log("No device selected yet.");
        return;
      }
      console.log("Fetching messages for device:", selectedDevice);
      try {
        setLoading(true);
        const response = await fetch(`http://172.20.10.2:5000/api/sms?deviceId=${selectedDevice}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch messages");
        const data = await response.json();
        console.log("Fetched messages:", data);
        setMessages(data);
      } catch (error) {
        console.error("Error fetching messages:", error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [selectedDevice, token]);

  return (
    <DashboardLayout>
      <DashboardNavbar absolute isMini />
      <MDBox mt={8}>
        <MDBox mb={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="device-select-label">Select Device</InputLabel>
                <Select
                  labelId="device-select-label"
                  value={selectedDevice}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    console.log("New selected device ID:", newValue);
                    setSelectedDevice(newValue);
                  }}
                >
                  {devices.length > 0 ? (
                    devices.map((device) => (
                      <MenuItem key={device.device_identifier} value={device.device_identifier}>
                        {device.device_name} ({device.device_identifier})
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No devices available</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>

            {error && (
              <Grid item xs={12}>
                <p style={{ color: "red" }}>{error}</p>
              </Grid>
            )}

            <Grid item xs={12}>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Sender</TableCell>
                      <TableCell>Message</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(messages) && messages.length > 0 ? (
                      messages.map((msg, index) => (
                        <TableRow key={index}>
                          <TableCell>{msg.sender}</TableCell>
                          <TableCell>{msg.message}</TableCell>
                          <TableCell>{new Date(msg.date).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          No messages available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </MDBox>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Sms;
