import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

function RideDetails() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  useEffect(() => {
    let isCurrent = true;

    async function loadRide() {
      try {
        const headers = {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        };
        const response = await fetch(`http://localhost:5001/api/rides/${rideId}`, {
          headers,
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

        const requestResponse = await fetch(
          `http://localhost:5001/api/rides/${rideId}/request`,
          { headers }
        );
        const requestData = await requestResponse.json();
        if (isCurrent && requestResponse.ok) {
          setRequestStatus(requestData.request?.status || null);
        }
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

  const handleRequestSeat = async () => {
    setMessage("");
    setIsRequesting(true);

    try {
      const response = await fetch(`http://localhost:5001/api/rides/${rideId}/request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to request a seat.");
        if (data.request?.status) {
          setRequestStatus(data.request.status);
        }
        return;
      }

      setRequestStatus(data.request.status);
      setMessage(data.message);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    } finally {
      setIsRequesting(false);
    }
  };

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
          <div className="ride-request-actions">
            {requestStatus ? (
              <p role="status">Seat request status: {requestStatus}</p>
            ) : (
              <button type="button" onClick={handleRequestSeat} disabled={isRequesting}>
                {isRequesting ? "Requesting..." : "Request a seat"}
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

export default RideDetails;
