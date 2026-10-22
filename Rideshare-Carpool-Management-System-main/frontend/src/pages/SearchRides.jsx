import { useState } from "react";
import { useNavigate } from "react-router-dom";

const initialFilters = {
  origin: "",
  destination: "",
  departureDate: "",
};

function SearchRides() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [rides, setRides] = useState([]);
  const [message, setMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  const handleChange = (event) => {
    setFilters({ ...filters, [event.target.name]: event.target.value });
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    setMessage("");
    setIsSearching(true);
    setHasSearched(true);

    try {
      const token = localStorage.getItem("token");
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value.trim())
      );
      const response = await fetch(`http://localhost:5001/api/rides?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setRides([]);
        setMessage(data.message || "Unable to search rides.");
        return;
      }

      setRides(data.rides);
      if (data.rides.length === 0) {
        setMessage("No available rides match your search.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
      setRides([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setFilters(initialFilters);
    setRides([]);
    setMessage("");
    setHasSearched(false);
  };

  if (!user) {
    return (
      <main className="ride-page">
        <h1>Find a Ride</h1>
        <p>Please log in to search available rides.</p>
        <button type="button" onClick={() => navigate("/login")}>Go to Login</button>
      </main>
    );
  }

  if (user.role !== "Rider") {
    return (
      <main className="ride-page">
        <h1>Find a Ride</h1>
        <p>Ride search is available to rider accounts.</p>
      </main>
    );
  }

  return (
    <main className="ride-page ride-search-page">
      <h1>Find a Ride</h1>
      <form className="ride-form" onSubmit={handleSearch}>
        <label>
          Pickup location
          <input
            type="search"
            name="origin"
            value={filters.origin}
            onChange={handleChange}
            placeholder="Any pickup location"
          />
        </label>

        <label>
          Destination
          <input
            type="search"
            name="destination"
            value={filters.destination}
            onChange={handleChange}
            placeholder="Any destination"
          />
        </label>

        <label>
          Departure date
          <input
            type="date"
            name="departureDate"
            value={filters.departureDate}
            onChange={handleChange}
          />
        </label>

        <div className="ride-search-actions">
          <button type="submit" disabled={isSearching}>
            {isSearching ? "Searching..." : "Search Rides"}
          </button>
          <button type="button" className="ride-clear-button" onClick={handleClear}>
            Clear
          </button>
        </div>
      </form>

      {message && <p className="ride-message" role="status">{message}</p>}

      {rides.length > 0 && (
        <section className="ride-results" aria-label="Available rides">
          <h2>{rides.length} available {rides.length === 1 ? "ride" : "rides"}</h2>
          {rides.map((ride) => (
            <article className="ride-result" key={ride._id}>
              <div>
                <h3>{ride.origin} <span aria-hidden="true">to</span> {ride.destination}</h3>
                <p>{new Date(ride.departureTime).toLocaleString()}</p>
                <p>Driver: {ride.driver?.name || "Driver"}</p>
              </div>
              <div className="ride-result-details">
                <strong>{ride.availableSeats} {ride.availableSeats === 1 ? "seat" : "seats"}</strong>
                <span>{Number(ride.pricePerSeat).toFixed(2)} per seat</span>
                <button
                  type="button"
                  className="ride-detail-button"
                  onClick={() => navigate(`/rides/${ride._id}`)}
                >
                  View details
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      {!hasSearched && <p className="ride-hint">Search by route or date, or leave filters blank to see all upcoming rides.</p>}
    </main>
  );
}

export default SearchRides;
