/* oxlint-disable react(set-state-in-effect) */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function ManageRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(null);
  const [message, setMessage] = useState("");
  const [updatingRequestId, setUpdatingRequestId] = useState(null);
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const loadRequests = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/rides/driver/requests", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to load passenger requests.");
        return;
      }

      // The fetch is started by the effect, so this stores its loaded data.
      // oxlint-disable-next-line react(set-state-in-effect)
      setRequests(data.requests);
    } catch (error) {
      console.error(error);
      // The fetch is started by the effect, so this is the error state for that load.
      // oxlint-disable-next-line react(set-state-in-effect)
      setMessage("Unable to connect to the server.");
    }
  };

  useEffect(() => {
    if (user?.role === "Driver") {
      // Load the driver's requests when the page is opened.
      // oxlint-disable-next-line react(set-state-in-effect)
      loadRequests();
    }
  }, [user?.role]);

  const handleDecision = async (requestId, status) => {
    setMessage("");
    setUpdatingRequestId(requestId);

    try {
      const response = await fetch(
        `http://localhost:5001/api/rides/driver/requests/${requestId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ status }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to update this request.");
        await loadRequests();
        return;
      }

      setRequests((currentRequests) =>
        currentRequests.map((request) =>
          request._id === requestId ? { ...request, status } : request
        )
      );
      setMessage(data.message);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    } finally {
      setUpdatingRequestId(null);
    }
  };

  if (!user) {
    return (
      <main className="ride-page">
        <h1>Manage Requests</h1>
        <p>Please log in to manage passenger requests.</p>
        <button type="button" onClick={() => navigate("/login")}>Go to Login</button>
      </main>
    );
  }

  if (user.role !== "Driver") {
    return (
      <main className="ride-page">
        <h1>Manage Requests</h1>
        <p>Passenger request management is available to driver accounts.</p>
      </main>
    );
  }

  return (
    <main className="ride-page">
      <h1>Manage Requests</h1>
      {requests === null && <p role="status">Loading passenger requests...</p>}
      {message && <p className="ride-message" role="status">{message}</p>}
      {requests !== null && requests.length === 0 && (
        <p>No passenger requests have been submitted for your rides.</p>
      )}
      {requests !== null && requests.length > 0 && (
        <section className="ride-results" aria-label="Passenger requests">
          {requests.map((request) => (
            <article className="ride-result" key={request._id}>
              <div>
                <h2>{request.ride.origin} <span aria-hidden="true">to</span> {request.ride.destination}</h2>
                <p>{new Date(request.ride.departureTime).toLocaleString()}</p>
                <p>
                  Passenger: {request.rider?.name || "Rider"}
                  {request.rider?.email ? ` (${request.rider.email})` : ""}
                </p>
              </div>
              <div className="ride-result-details">
                <strong>{request.status}</strong>
                {request.status === "Pending" && (
                  <div className="ride-request-actions">
                    <button
                      type="button"
                      onClick={() => handleDecision(request._id, "Approved")}
                      disabled={updatingRequestId === request._id}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="ride-clear-button"
                      onClick={() => handleDecision(request._id, "Rejected")}
                      disabled={updatingRequestId === request._id}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default ManageRequests;
