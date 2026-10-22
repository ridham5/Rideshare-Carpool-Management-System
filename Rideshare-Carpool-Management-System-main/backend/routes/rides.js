const express = require("express");
const mongoose = require("mongoose");
const Ride = require("../models/Ride");
const { requireAuth, requireDriver, requireRider } = require("../middleware/auth");

const router = express.Router();

function validateRideData({ origin, destination, departureTime, availableSeats, pricePerSeat }) {
  const departureDate = new Date(departureTime);
  const seats = Number(availableSeats);
  const price = Number(pricePerSeat);

  if (!origin?.trim() || !destination?.trim()) {
    return { valid: false, message: "Enter both a pickup location and destination." };
  }

  if (origin.trim().toLowerCase() === destination.trim().toLowerCase()) {
    return { valid: false, message: "Pickup location and destination must be different." };
  }

  if (!departureTime || Number.isNaN(departureDate.getTime()) || departureDate <= new Date()) {
    return { valid: false, message: "Choose a valid future departure time." };
  }

  if (!Number.isInteger(seats) || seats < 1) {
    return { valid: false, message: "Available seats must be a whole number greater than zero." };
  }

  if (!Number.isFinite(price) || price < 0) {
    return { valid: false, message: "Price per seat must be zero or more." };
  }

  return { valid: true, message: "" };
}

function buildRideSearchQuery({ origin, destination, departureDate }) {
  const query = {
    availableSeats: { $gt: 0 },
    departureTime: { $gt: new Date() },
  };

  for (const [field, value] of [["origin", origin], ["destination", destination]]) {
    const trimmedValue = value?.trim();
    if (trimmedValue) {
      const escapedValue = trimmedValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query[field] = { $regex: escapedValue, $options: "i" };
    }
  }

  if (departureDate) {
    const startOfDay = new Date(`${departureDate}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(departureDate) ||
      Number.isNaN(startOfDay.getTime()) ||
      startOfDay.toISOString().slice(0, 10) !== departureDate
    ) {
      throw new TypeError("Choose a valid departure date.");
    }

    const nextDay = new Date(startOfDay);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    query.departureTime.$gte = startOfDay;
    query.departureTime.$lt = nextDay;
  }

  return query;
}

router.get("/", requireAuth, requireRider, async (req, res) => {
  let query;
  try {
    query = buildRideSearchQuery(req.query);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  try {
    const rides = await Ride.find(query)
      .populate("driver", "name")
      .sort({ departureTime: 1 });

    return res.status(200).json({ rides });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error." });
  }
});

router.get("/:rideId", requireAuth, requireRider, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.rideId)) {
    return res.status(400).json({ message: "Invalid ride ID." });
  }

  try {
    const ride = await Ride.findOne({
      _id: req.params.rideId,
      availableSeats: { $gt: 0 },
      departureTime: { $gt: new Date() },
    }).populate("driver", "name");

    if (!ride) {
      return res.status(404).json({ message: "This ride is no longer available." });
    }

    return res.status(200).json({ ride });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error." });
  }
});

router.post("/", requireAuth, requireDriver, async (req, res) => {
  try {
    const validation = validateRideData(req.body);

    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    const ride = await Ride.create({
      driver: req.user._id,
      origin: req.body.origin.trim(),
      destination: req.body.destination.trim(),
      departureTime: new Date(req.body.departureTime),
      availableSeats: Number(req.body.availableSeats),
      pricePerSeat: Number(req.body.pricePerSeat),
    });

    return res.status(201).json({
      message: "Ride posted successfully.",
      ride,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error." });
  }
});

router.validateRideData = validateRideData;
router.buildRideSearchQuery = buildRideSearchQuery;

module.exports = router;
