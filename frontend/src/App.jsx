import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import PostRide from "./pages/PostRide";
import SearchRides from "./pages/SearchRides";
import RideDetails from "./pages/RideDetails";
import ManageRequests from "./pages/ManageRequests";
import UpcomingTrips from "./pages/UpcomingTrips";
import Notifications from "./pages/Notifications";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/register">Register</Link>
        {" | "}
        <Link to="/login">Login</Link>
        {" | "}
        <Link to="/profile">Profile</Link>
        {" | "}
        <Link to="/rides/post">Post a Ride</Link>
        {" | "}
        <Link to="/rides/find">Find a Ride</Link>
        {" | "}
        <Link to="/rides/requests">Manage Requests</Link>
        {" | "}
        <Link to="/rides/upcoming">Upcoming Trips</Link>
        {" | "}
        <Link to="/notifications">Notifications</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/rides/post" element={<PostRide />} />
        <Route path="/rides/find" element={<SearchRides />} />
        <Route path="/rides/:rideId" element={<RideDetails />} />
        <Route path="/rides/requests" element={<ManageRequests />} />
        <Route path="/rides/upcoming" element={<UpcomingTrips />} />
        <Route path="/notifications" element={<Notifications />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;