import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(null);
  const [message, setMessage] = useState("");
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userId = user?.id;

  const loadNotifications = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/notifications", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to load notifications.");
        setNotifications([]);
        return;
      }

      setNotifications(data.notifications);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
      setNotifications([]);
    }
  };

  useEffect(() => {
    if (userId) {
      loadNotifications();
    }
  }, [userId]);

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        setMessage(data.message || "Unable to mark notification as read.");
        return;
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/notifications/read-all", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to mark notifications as read.");
        return;
      }

      setNotifications((current) =>
        current.map((notification) => ({ ...notification, read: true }))
      );
      setMessage(data.message);
    } catch (error) {
      console.error(error);
      setMessage("Unable to connect to the server.");
    }
  };

  if (!user) {
    return (
      <main className="ride-page">
        <h1>Notifications</h1>
        <p>Please log in to view your notifications.</p>
        <button type="button" onClick={() => navigate("/login")}>Go to Login</button>
      </main>
    );
  }

  const unreadCount = notifications?.filter((notification) => !notification.read).length || 0;

  return (
    <main className="ride-page">
      <div className="notifications-heading">
        <h1>Notifications</h1>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>
      {notifications === null && <p role="status">Loading notifications...</p>}
      {message && <p className="ride-message" role="status">{message}</p>}
      {notifications?.length === 0 && !message && (
        <p>You do not have any notifications yet.</p>
      )}
      {notifications && notifications.length > 0 && (
        <section className="notification-list" aria-label="Notifications">
          {notifications.map((notification) => (
            <article
              className={`notification-item${notification.read ? "" : " notification-unread"}`}
              key={notification._id}
            >
              <p>{notification.message}</p>
              <time dateTime={notification.createdAt}>
                {new Date(notification.createdAt).toLocaleString()}
              </time>
              {!notification.read && (
                <button type="button" onClick={() => markAsRead(notification._id)}>
                  Mark as read
                </button>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default Notifications;
