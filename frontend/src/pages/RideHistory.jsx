/* oxlint-disable react(set-state-in-effect) */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function RideHistory() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState(null);
  const [message, setMessage] = useState("");
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  useEffect(() => {
    let isCurrent = true;

    async function loadHistory() {
      try {
        const response = await fetch("http://localhost:5001/api/rides/history", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await response.json();

        if (!isCurrent) {
          return;
        }

        if (!response.ok) {
          setMessage(data.message || "Unable to load ride history.");
          setTrips([]);
          return;
        }

        setTrips(data.trips);
      } catch (error) {
        console.error(error);
        if (isCurrent) {
          setMessage("Unable to connect to the server.");
          setTrips([]);
        }
      }
    }

    if (user) {
      loadHistory();
    }

    return () => {
      isCurrent = false;
    };
  }, [user?.role]);

  if (!user) {
    return (
      <main className="ride-page">
        <h1>Ride History</h1>
        <p>Please log in to view your ride history.</p>
        <button type="button" onClick={() => navigate("/login")}>Go to Login</button>
      </main>
    );
  }

  return (
    <main className="ride-page">
      <h1>Ride History</h1>
      {trips === null && <p role="status">Loading ride history...</p>}
      {message && <p className="ride-message" role="status">{message}</p>}
      {trips?.length === 0 && !message && (
        <p>You do not have any completed trips yet.</p>
      )}
      {trips && trips.length > 0 && (
        <section className="ride-results" aria-label="Ride history">
          {trips.map(({ ride, role, status }) => (
            <article className="ride-result" key={ride._id}>
              <div>
                <h2>{ride.origin} <span aria-hidden="true">to</span> {ride.destination}</h2>
                <p>{new Date(ride.departureTime).toLocaleString()}</p>
                <p>
                  {role === "Driver"
                    ? "You drove"
                    : `Driver: ${ride.driver?.name || "Driver"}`}
                </p>
              </div>
              <div className="ride-result-details">
                <strong>{status}</strong>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default RideHistory;
