# Rideshare / Carpool Management System

![CI](https://github.com/ridham5/Rideshare-Carpool-Management-System/actions/workflows/ci.yml/badge.svg)

A full-stack web app where drivers post rides and riders search, request and book seats.
Built by a 3-person Agile team over four two-week Scrum sprints for CPS714 (Software Project
Management) at Toronto Metropolitan University, Fall 2026.

**My role: Project Manager and backend developer** (booking and notification APIs, auth
middleware, seat-count logic, MongoDB setup, integration testing).

## Features

- **Accounts**: register and log in as a Driver or Rider; passwords hashed with bcrypt; JWT sessions; profile editing
- **Rides**: drivers post rides; riders search with filters and view ride details
- **Seat requests**: riders request a seat; drivers approve or reject
- **No overbooking**: approving a request decrements seats with an atomic MongoDB `$inc`
  that only succeeds while seats remain; cancelling returns the seat
- **Trips and cancellations**: upcoming trips for drivers and riders; riders cancel bookings, drivers cancel rides
- **Notifications**: created on request, approval, rejection and cancellation; mark one or all as read
- **Access control**: `requireAuth`, `requireDriver` and `requireRider` middleware plus ownership
  checks on every booking route

## Tech stack

React (Vite) · Node.js · Express · MongoDB Atlas (Mongoose) · JWT · bcrypt · Node.js test runner

## API (16 endpoints)

| Method | Route | Who |
| --- | --- | --- |
| POST | `/api/auth/register` | Anyone |
| POST | `/api/auth/login` | Anyone |
| PUT | `/api/auth/update-profile` | Signed in |
| POST | `/api/rides` | Driver |
| GET | `/api/rides` | Rider (search) |
| GET | `/api/rides/:rideId` | Rider |
| GET | `/api/rides/upcoming` | Signed in |
| DELETE | `/api/rides/:rideId` | Driver (cancel ride) |
| POST | `/api/rides/:rideId/request` | Rider |
| GET | `/api/rides/:rideId/request` | Rider |
| DELETE | `/api/rides/:rideId/booking` | Rider (cancel booking) |
| GET | `/api/rides/driver/requests` | Driver |
| PATCH | `/api/rides/driver/requests/:requestId` | Driver (approve / reject) |
| GET | `/api/notifications` | Signed in |
| PATCH | `/api/notifications/:notificationId/read` | Signed in |
| PATCH | `/api/notifications/read-all` | Signed in |

## Run it locally

```bash
# backend
cd backend
npm install
# create backend/.env with:
#   MONGO_URI=<your MongoDB connection string>
#   JWT_SECRET=<any long random string>
#   PORT=5001
node server.js

# tests
npm test

# frontend (new terminal)
cd frontend
npm install
npm run dev
```

## How we worked

- Four two-week Scrum sprints with sprint planning, check-ins, burndown and Gantt tracking
- Sprints 1–3: **11 user stories (44 tasks) delivered on schedule**
- Feature branches and pull requests on GitHub

## Team

Three-person team: Project Manager / Developer (me), Product Owner / Developer, Scrum Master / Developer.
