import React, { useState, useEffect } from "react";
import { Grid, Typography, Select, MenuItem, Collapse } from "@mui/material";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

const API_BASE_URL = "http://172.20.10.2:5000/api";

const WhatsAppMessagesPage = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [messages, setMessages] = useState([]);
  const [openRecipient, setOpenRecipient] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Get JWT token from localStorage
  const token = localStorage.getItem("authToken");

  // Fetch devices using JWT authentication
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

  // Fetch WhatsApp messages when a device is selected
  useEffect(() => {
    if (selectedDevice) {
      fetch(`${API_BASE_URL}/mobile/device/${selectedDevice}/whatsapp-messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch messages");
          }
          return response.json();
        })
        .then((data) => {
          setMessages(data.messages || []);
        })
        .catch((err) => console.error("Error fetching messages:", err));
    }
  }, [selectedDevice, token]);

  // Group messages by recipient name
  const messagesByRecipient = Array.isArray(messages)
    ? messages.reduce((acc, msg) => {
        const recipient = msg.recipient_name;
        if (!acc[recipient]) {
          acc[recipient] = [];
        }
        acc[recipient].push(msg);
        return acc;
      }, {})
    : {};

  const handleRecipientClick = (recipient) => {
    setOpenRecipient((prev) => ({
      ...prev,
      [recipient]: !prev[recipient],
    }));
  };

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox py={3}>
        <Grid container spacing={3}>
          {/* Header */}
          <Grid item xs={12}>
            <Typography variant="h4" gutterBottom>
              WhatsApp Messages
            </Typography>
          </Grid>
          {/* Device Selection */}
          <Grid item xs={12}>
            <MDBox mb={3}>
              <Typography variant="h6" gutterBottom>
                Select Device
              </Typography>
              <Select
                fullWidth
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select a Device</em>
                </MenuItem>
                {devices.map((device) => (
                  <MenuItem key={device.device_identifier} value={device.device_identifier}>
                    {device.name || device.device_identifier}
                  </MenuItem>
                ))}
              </Select>
            </MDBox>
          </Grid>
        </Grid>
        {/* Display messages grouped by recipient */}
        <MDBox mt={4.5}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {selectedDevice && (
                <>
                  {Object.keys(messagesByRecipient).map((recipient) => (
                    <React.Fragment key={recipient}>
                      <MDBox
                        onClick={() => handleRecipientClick(recipient)}
                        sx={{
                          cursor: "pointer",
                          backgroundColor: "#eeeeee",
                          p: 1,
                          borderRadius: "4px",
                          mb: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="h6" sx={{ color: "#333" }}>
                          {recipient}
                        </Typography>
                        {openRecipient[recipient] ? (
                          <ExpandLess sx={{ color: "#333" }} />
                        ) : (
                          <ExpandMore sx={{ color: "#333" }} />
                        )}
                      </MDBox>
                      <Collapse in={openRecipient[recipient]} timeout="auto" unmountOnExit>
                        {/* Scrollable chat box */}
                        <MDBox
                          sx={{
                            maxHeight: 400,
                            overflowY: "auto",
                            p: 2,
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            backgroundColor: "#f5f5f5",
                            mb: 3,
                          }}
                        >
                          {messagesByRecipient[recipient].map((msg, index) => (
                            <MDBox
                              key={index}
                              sx={{
                                display: "flex",
                                justifyContent: msg.from === "owner" ? "flex-end" : "flex-start",
                                mb: 1,
                              }}
                            >
                              <MDBox
                                sx={{
                                  maxWidth: "70%",
                                  p: 1.5,
                                  borderRadius: "12px",
                                  backgroundColor: msg.from === "owner" ? "#dcf8c6" : "#ffffff",
                                  border:
                                    msg.from === "owner" ? "1px solid #a5d6a7" : "1px solid #ccc",
                                  boxShadow: 2,
                                  position: "relative",
                                }}
                              >
                                <Typography variant="body1" sx={{ color: "#333" }}>
                                  {msg.message}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    display: "block",
                                    textAlign: msg.from === "owner" ? "right" : "left",
                                    color: "#777",
                                    mt: 0.5,
                                  }}
                                >
                                  {msg.timestamp}
                                </Typography>
                              </MDBox>
                            </MDBox>
                          ))}
                        </MDBox>
                      </Collapse>
                    </React.Fragment>
                  ))}
                </>
              )}
            </Grid>
          </Grid>
        </MDBox>
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
};

export default WhatsAppMessagesPage;
