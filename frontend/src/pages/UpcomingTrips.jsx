import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function UpcomingTrips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState(null);
  const [message, setMessage] = useState("");
  const [cancellingRideId, setCancellingRideId] = useState(null);
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userRole = user?.role;

  useEffect(() => {
    if (!userRole) {
      return;
    }

    async function loadTrips() {
      try {
        const response = await fetch("http://localhost:5001/api/rides/upcoming", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          setMessage(data.message || "Unable to load upcoming trips.");
          setTrips([]);
          return;
        }

        setTrips(data.trips);
      } catch (error) {
        console.error(error);
        setMessage("Unable to connect to the server.");
        setTrips([]);
      }
    }

    loadTrips();
  }, [userRole]);

  const handleCancel = async (rideId, role) => {
    const action = role === "Driver" ? "ride" : "booking";
    if (!window.confirm(`Cancel this ${action}?`)) {
      return;
    }

    setMessage("");
    setCancellingRideId(rideId);

    try {
      const endpoint = role === "Driver"
        ? `http://localhost:5001/api/rides/${rideId}`
        : `http://localhost:5001/api/rides/${rideId}/booking`;
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || `Unable to cancel this ${action}.`);
        return;
      }

      setTrips((currentTrips) => currentTrips.filter((trip) => trip.ride._id !== rideId));
      setMessage(data.message);
    } catch (error) {
      console.error(error);
      setMessage(`Unable to cancel this ${action}.`);
    } finally {
      setCancellingRideId(null);
    }
  };

  if (!user) {
    return (
      <main className="ride-page">
        <h1>Upcoming Trips</h1>
        <p>Please log in to view your upcoming trips.</p>
        <button type="button" onClick={() => navigate("/login")}>Go to Login</button>
      </main>
    );
  }

  return (
    <main className="ride-page">
      <h1>Upcoming Trips</h1>
      {trips === null && <p role="status">Loading upcoming trips...</p>}
      {message && <p className="ride-message" role="status">{message}</p>}
      {trips?.length === 0 && !message && (
        <p>You do not have any upcoming trips yet.</p>
      )}
      {trips && trips.length > 0 && (
        <section className="ride-results" aria-label="Upcoming trips">
          {trips.map(({ ride, role, status }) => (
            <article className="ride-result" key={ride._id}>
              <div>
                <h2>{ride.origin} <span aria-hidden="true">to</span> {ride.destination}</h2>
                <p>{new Date(ride.departureTime).toLocaleString()}</p>
                <p>
                  {role === "Driver"
                    ? "You are driving"
                    : `Driver: ${ride.driver?.name || "Driver"}`}
                </p>
              </div>
              <div className="ride-result-details">
                <strong>{status}</strong>
                <span>{ride.availableSeats} available {ride.availableSeats === 1 ? "seat" : "seats"}</span>
                <button
                  type="button"
                  className="ride-clear-button"
                  onClick={() => handleCancel(ride._id, role)}
                  disabled={cancellingRideId === ride._id}
                >
                  {cancellingRideId === ride._id
                    ? "Cancelling..."
                    : role === "Driver" ? "Cancel ride" : "Cancel booking"}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default UpcomingTrips;
