import { useState, useEffect } from "react";

function DeviceSelector({ onSelectDevice }) {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const token = localStorage.getItem("token");

        const response = await fetch("http://172.20.10.2:5000/api/devices", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch devices");
        const data = await response.json();
        setDevices(data);
      } catch (err) {
        console.error("Error fetching devices:", err);
      }
    };

    fetchDevices();
  }, []);

  const handleSelect = (event) => {
    const deviceId = event.target.value;
    setSelectedDevice(deviceId);
    onSelectDevice(deviceId);
  };

  return (
    <div>
      <label>Select Device:</label>
      <select onChange={handleSelect} value={selectedDevice || ""}>
        <option value="">Choose a device</option>
        {devices.map((device) => (
          <option key={device.id} value={device.id}>
            {device.device_name} ({device.device_identifier})
          </option>
        ))}
      </select>
    </div>
  );
}

export default DeviceSelector;
