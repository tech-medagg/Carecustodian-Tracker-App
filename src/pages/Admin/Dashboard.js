import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Snackbar,
  Alert,
  Chip,
  IconButton,
} from "@mui/material";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Download as DownloadIcon, Refresh as RefreshIcon } from '@mui/icons-material';

const AdminDashboard = () => {
  const [trips, setTrips] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    const storedTrips = JSON.parse(localStorage.getItem("salesmanTrips")) || [];
    setTrips(storedTrips);

    const location = localStorage.getItem("live_location");
    if (location) {
      const coords = JSON.parse(location);
      setCurrentLocation(coords);
    }
  }, []);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Salesman Trip Report", 10, 10);
    trips.forEach((trip, index) => {
      const y = 20 + index * 10;
      doc.text(
        `${index + 1}. ${trip.from} to ${trip.to} - ${trip.distance} km - ₹${trip.cost} - ${trip.status}`,
        10,
        y
      );
    });
    doc.save("trip-report.pdf");
    showSnackbar("PDF exported successfully");
  };

  const handleExportCSV = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,From,To,Distance,Cost,Status\n" +
      trips.map((t) => `${t.from},${t.to},${t.distance},${t.cost},${t.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "trip-report.csv");
    document.body.appendChild(link);
    link.click();
    showSnackbar("CSV exported successfully");
  };

  const toggleTripStatus = (index) => {
    const updatedTrips = [...trips];
    updatedTrips[index].status = updatedTrips[index].status === "Completed" ? "Ongoing" : "Completed";
    setTrips(updatedTrips);
    localStorage.setItem("salesmanTrips", JSON.stringify(updatedTrips));
    showSnackbar("Trip status updated");
  };

  const refreshTrips = () => {
    const storedTrips = JSON.parse(localStorage.getItem("salesmanTrips")) || [];
    setTrips(storedTrips);
    showSnackbar("Trip list refreshed");
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>

      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <Button variant="contained" onClick={handleExportPDF} startIcon={<DownloadIcon />}>Export PDF</Button>
        </Grid>
        <Grid item>
          <Button variant="outlined" onClick={handleExportCSV} startIcon={<DownloadIcon />}>Export CSV</Button>
        </Grid>
        <Grid item>
          <IconButton onClick={refreshTrips}><RefreshIcon /></IconButton>
        </Grid>
      </Grid>

      <Box mt={4}>
        {trips.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100px">
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {trips.map((trip, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Paper elevation={3} sx={{ p: 2 }}>
                  <Typography variant="subtitle1"><strong>From:</strong> {trip.from}</Typography>
                  <Typography variant="subtitle1"><strong>To:</strong> {trip.to}</Typography>
                  <Typography variant="body2">Distance: {trip.distance} km</Typography>
                  <Typography variant="body2">Estimated Cost: ₹{trip.cost}</Typography>
                  <Chip
                    label={trip.status}
                    color={trip.status === "Completed" ? "success" : "warning"}
                    onClick={() => toggleTripStatus(index)}
                    sx={{ mt: 1 }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Box mt={4}>
        <Typography variant="h6" gutterBottom>📍 Real-time Salesman Location</Typography>
        <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "400px", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {currentLocation && (
            <Marker position={currentLocation}>
              <Popup>📍 Live Salesman Location</Popup>
            </Marker>
          )}
        </MapContainer>
      </Box>

      <Snackbar open={snackbarOpen} autoHideDuration={3000} onClose={handleSnackbarClose}>
        <Alert severity="info" onClose={handleSnackbarClose}>{snackbarMessage}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminDashboard;
