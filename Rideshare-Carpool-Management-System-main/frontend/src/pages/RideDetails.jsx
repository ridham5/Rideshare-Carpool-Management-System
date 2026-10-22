import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

function RideDetails() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  useEffect(() => {
    let isCurrent = true;

    async function loadRide() {
      try {
        const response = await fetch(`http://localhost:5001/api/rides/${rideId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await response.json();

        if (!isCurrent) {
          return;
        }

        if (!response.ok) {
          setMessage(data.message || "Unable to load ride details.");
          return;
        }

        setRide(data.ride);
      } catch (error) {
        console.error(error);
        if (isCurrent) {
          setMessage("Unable to connect to the server.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    if (user?.role === "Rider") {
      loadRide();
    }

    return () => {
      isCurrent = false;
    };
  }, [rideId, user?.role]);

  if (!user) {
    return (
      <main className="ride-page">
        <h1>Ride Details</h1>
        <p>Please log in to view ride details.</p>
        <button type="button" onClick={() => navigate("/login")}>Go to Login</button>
      </main>
    );
  }

  if (user.role !== "Rider") {
    return (
      <main className="ride-page">
        <h1>Ride Details</h1>
        <p>Ride details are available to rider accounts.</p>
      </main>
    );
  }

  return (
    <main className="ride-page">
      <Link className="ride-back-link" to="/rides/find">Back to ride search</Link>
      <h1>Ride Details</h1>
      {isLoading && <p role="status">Loading ride details...</p>}
      {!isLoading && message && <p role="status">{message}</p>}
      {!isLoading && ride && (
        <section className="ride-detail-content" aria-label="Ride details">
          <h2>{ride.origin} <span aria-hidden="true">to</span> {ride.destination}</h2>
          <dl>
            <div>
              <dt>Pickup location</dt>
              <dd>{ride.origin}</dd>
            </div>
            <div>
              <dt>Destination</dt>
              <dd>{ride.destination}</dd>
            </div>
            <div>
              <dt>Departure</dt>
              <dd>{new Date(ride.departureTime).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Driver</dt>
              <dd>{ride.driver?.name || "Driver"}</dd>
            </div>
            <div>
              <dt>Available seats</dt>
              <dd>{ride.availableSeats}</dd>
            </div>
            <div>
              <dt>Price per seat</dt>
              <dd>{Number(ride.pricePerSeat).toFixed(2)}</dd>
            </div>
          </dl>
        </section>
      )}
    </main>
  );
}

export default RideDetails;
