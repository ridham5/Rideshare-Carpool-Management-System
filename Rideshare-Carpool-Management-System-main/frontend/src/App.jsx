import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import PostRide from "./pages/PostRide";
import SearchRides from "./pages/SearchRides";
import RideDetails from "./pages/RideDetails";
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
      </nav>

      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/rides/post" element={<PostRide />} />
        <Route path="/rides/find" element={<SearchRides />} />
        <Route path="/rides/:rideId" element={<RideDetails />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;