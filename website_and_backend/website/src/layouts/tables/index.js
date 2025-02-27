import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DataTable from "examples/Tables/DataTable";
import { useState, useEffect } from "react";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";

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

function ContactsTable() {
  const [contacts, setContacts] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get userId from the token
  const token = localStorage.getItem("authToken");
  console.log("Retrieved token:", token);

  const decodedToken = token ? decodeJWT(token) : null;
  const userId = decodedToken?.userId;
  console.log("Decoded userId:", userId);

  // Fetch devices for the logged-in user
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
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

  // Fetch contacts when a device is selected
  useEffect(() => {
    if (!selectedDeviceId) return;

    const fetchContacts = async () => {
      console.log("Fetching contacts for deviceId:", selectedDeviceId);
      try {
        setLoading(true);
        const response = await fetch(
          `http://172.20.10.2:5000/api/contacts?deviceId=${selectedDeviceId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch contacts");

        const data = await response.json();
        console.log("Fetched contacts:", data);
        setContacts(data);
      } catch (err) {
        console.error("Error fetching contacts:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [selectedDeviceId, token]);

  // Table columns configuration
  const columns = [
    { Header: "Name", accessor: "name", width: "30%" },
    { Header: "Phone Number", accessor: "phone_number", width: "25%" },
    { Header: "Created At", accessor: "created_at", width: "25%" },
    { Header: "Device ID", accessor: "device_id", width: "20%" },
  ];

  // Transform contact data for table rows
  const rows = contacts.map((contact) => ({
    name: contact.name,
    phone_number: contact.phone_number,
    created_at: new Date(contact.created_at).toLocaleString(),
    device_id: contact.device_identifier,
  }));

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <Card>
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
              >
                <MDTypography variant="h6" color="white">
                  SMS Contacts
                </MDTypography>
              </MDBox>
              <MDBox pt={3} px={2}>
                <FormControl fullWidth>
                  <InputLabel id="device-select-label">Select Device</InputLabel>
                  <Select
                    labelId="device-select-label"
                    value={selectedDeviceId}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      console.log("New selected device ID:", newValue);
                      setSelectedDeviceId(newValue);
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
              </MDBox>
              <MDBox pt={3}>
                {loading ? (
                  <MDBox p={3} textAlign="center">
                    <MDTypography variant="body2">Loading...</MDTypography>
                  </MDBox>
                ) : error ? (
                  <MDBox p={3} textAlign="center">
                    <MDTypography variant="body2" color="error">
                      Error: {error}
                    </MDTypography>
                  </MDBox>
                ) : (
                  <DataTable
                    table={{ columns, rows }}
                    isSorted={false}
                    entriesPerPage={10}
                    showTotalEntries={true}
                    noEndBorder
                  />
                )}
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
    </DashboardLayout>
  );
}

export default ContactsTable;
