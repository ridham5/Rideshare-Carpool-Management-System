import { useState } from "react";
import { useNavigate } from "react-router-dom";

const initialForm = {
  origin: "",
  destination: "",
  departureTime: "",
  availableSeats: "1",
  pricePerSeat: "0",
};

function PostRide() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [minimumDepartureTime] = useState(() =>
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
  );
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    const token = localStorage.getItem("token");
    if (!token || !user) {
      setMessage("Please log in to post a ride.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("http://localhost:5001/api/rides", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to post ride.");
        return;
      }

      setFormData(initialForm);
      setMessage(data.message);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <main className="ride-page">
        <h1>Post a Ride</h1>
        <p>Please log in to post a ride.</p>
        <button type="button" onClick={() => navigate("/login")}>Go to Login</button>
      </main>
    );
  }

  if (user.role !== "Driver") {
    return (
      <main className="ride-page">
        <h1>Post a Ride</h1>
        <p>Only driver accounts can post rides.</p>
      </main>
    );
  }

  return (
    <main className="ride-page">
      <h1>Post a Ride</h1>
      <form className="ride-form" onSubmit={handleSubmit}>
        <label>
          Pickup location
          <input
            type="text"
            name="origin"
            value={formData.origin}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Destination
          <input
            type="text"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Departure time
          <input
            type="datetime-local"
            name="departureTime"
            min={minimumDepartureTime}
            value={formData.departureTime}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Available seats
          <input
            type="number"
            name="availableSeats"
            min="1"
            step="1"
            value={formData.availableSeats}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Price per seat
          <input
            type="number"
            name="pricePerSeat"
            min="0"
            step="0.01"
            value={formData.pricePerSeat}
            onChange={handleChange}
            required
          />
        </label>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Posting..." : "Post Ride"}
        </button>
        {message && <p className="ride-message" role="status">{message}</p>}
      </form>
    </main>
  );
}

export default PostRide;
