import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(() => ({
    name: profileUser?.name || "",
    email: profileUser?.email || "",
  }));
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!profileUser) {
      return;
    }

    try {
      const response = await fetch("http://localhost:5001/api/auth/update-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to update profile.");
        return;
      }

      const updatedUser = {
        ...profileUser,
        ...data.user,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setProfileUser(updatedUser);
      setMessage("Profile updated successfully.");
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!profileUser) {
    return (
      <div>
        <h1>Profile</h1>
        <p>You must log in to view your profile.</p>
        <button onClick={() => navigate("/login")}>Go to Login</button>
      </div>
    );
  }

  return (
    <div>
      <h1>My Profile</h1>

      {isEditing ? (
        <form onSubmit={handleSave}>
          <div>
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <p>
            <strong>Role:</strong> {profileUser.role}
          </p>

          <button type="submit">Save Changes</button>
          <button
            type="button"
            onClick={() => {
              setFormData({ name: profileUser.name, email: profileUser.email });
              setIsEditing(false);
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
          <p>
            <strong>Name:</strong> {profileUser.name}
          </p>

          <p>
            <strong>Email:</strong> {profileUser.email}
          </p>

          <p>
            <strong>Role:</strong> {profileUser.role}
          </p>

          <button onClick={() => setIsEditing(true)}>Edit Profile</button>
        </>
      )}

      {message && <p>{message}</p>}
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Profile;