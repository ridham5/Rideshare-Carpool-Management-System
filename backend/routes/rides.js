const express = require("express");
const mongoose = require("mongoose");
const Ride = require("../models/Ride");
const RideRequest = require("../models/RideRequest");
const Notification = require("../models/Notification");
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

router.get("/driver/requests", requireAuth, requireDriver, async (req, res) => {
  try {
    const requests = await RideRequest.find()
      .populate({
        path: "ride",
        match: { driver: req.user._id },
        select: "origin destination departureTime availableSeats",
      })
      .populate("rider", "name email")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      requests: requests.filter((request) => request.ride),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error." });
  }
});

router.patch("/driver/requests/:requestId", requireAuth, requireDriver, async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    return res.status(400).json({ message: "Invalid request ID." });
  }

  if (!["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ message: "Choose approve or reject for this request." });
  }

  try {
    const request = await RideRequest.findOne({
      _id: requestId,
      status: "Pending",
    }).populate({
      path: "ride",
      match: { driver: req.user._id },
      select: "origin destination departureTime availableSeats",
    });

    if (!request || !request.ride) {
      return res.status(404).json({
        message: "This request is no longer available to manage.",
      });
    }

    if (status === "Approved") {
      const ride = await Ride.findOneAndUpdate(
        { _id: request.ride._id, availableSeats: { $gt: 0 } },
        { $inc: { availableSeats: -1 } },
        { new: true }
      );

      if (!ride) {
        return res.status(409).json({
          message: "This ride has no available seats.",
        });
      }
    }

    const updatedRequest = await RideRequest.findOneAndUpdate(
      { _id: request._id, status: "Pending" },
      { $set: { status } },
      { new: true }
    ).populate("rider", "name email");

    if (!updatedRequest) {
      if (status === "Approved") {
        await Ride.findByIdAndUpdate(request.ride._id, { $inc: { availableSeats: 1 } });
      }

      return res.status(409).json({
        message: "This request was already managed by another action.",
      });
    }

    await Notification.create({
      recipient: updatedRequest.rider._id,
      type: "RequestDecision",
      message: `Your request for ${request.ride.origin} to ${request.ride.destination} was ${status.toLowerCase()}.`,
      ride: request.ride._id,
    });

    return res.status(200).json({
      message: `Request ${status.toLowerCase()} successfully.`,
      request: updatedRequest,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error." });
  }
});

router.get("/upcoming", requireAuth, async (req, res) => {
  try {
    if (req.user.role === "Driver") {
      const rides = await Ride.find({
        driver: req.user._id,
        departureTime: { $gt: new Date() },
      })
        .populate("driver", "name")
        .sort({ departureTime: 1 });

      return res.status(200).json({
        trips: rides.map((ride) => ({
          ride,
          role: "Driver",
          status: "Driving",
        })),
      });
    }

    const requests = await RideRequest.find({
      rider: req.user._id,
      status: "Approved",
    })
      .populate({
        path: "ride",
        match: { departureTime: { $gt: new Date() } },
        populate: { path: "driver", select: "name" },
      })
      .sort({ createdAt: 1 });

    return res.status(200).json({
      trips: requests
        .filter((request) => request.ride)
        .map((request) => ({
          ride: request.ride,
          role: "Rider",
          status: request.status,
        })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error." });
  }
});

router.delete("/:rideId/booking", requireAuth, requireRider, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.rideId)) {
    return res.status(400).json({ message: "Invalid ride ID." });
  }

  try {
    const request = await RideRequest.findOneAndUpdate(
      {
        ride: req.params.rideId,
        rider: req.user._id,
        status: { $in: ["Pending", "Approved"] },
      },
      { $set: { status: "Cancelled" } },
      { new: false }
    );

    if (!request) {
      return res.status(404).json({ message: "This booking is no longer active." });
    }

    if (request.status === "Approved") {
      await Ride.findByIdAndUpdate(req.params.rideId, { $inc: { availableSeats: 1 } });
    }

    const ride = await Ride.findById(req.params.rideId).select("driver origin destination");
    if (ride) {
      await Notification.create({
        recipient: ride.driver,
        type: "BookingCancellation",
        message: `A rider cancelled their booking for ${ride.origin} to ${ride.destination}.`,
        ride: ride._id,
      });
    }

    return res.status(200).json({ message: "Booking cancelled successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error." });
  }
});

router.delete("/:rideId", requireAuth, requireDriver, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.rideId)) {
    return res.status(400).json({ message: "Invalid ride ID." });
  }

  try {
    const ride = await Ride.findOneAndDelete({
      _id: req.params.rideId,
      driver: req.user._id,
      departureTime: { $gt: new Date() },
    });

    if (!ride) {
      return res.status(404).json({ message: "This ride is no longer available to cancel." });
    }

    const activeRequests = await RideRequest.find({
      ride: ride._id,
      status: { $in: ["Pending", "Approved"] },
    }).select("rider");

    if (activeRequests.length > 0) {
      await Notification.insertMany(
        activeRequests.map((request) => ({
          recipient: request.rider,
          type: "RideCancellation",
          message: `The ride from ${ride.origin} to ${ride.destination} was cancelled by the driver.`,
          ride: ride._id,
        }))
      );
    }

    await RideRequest.deleteMany({ ride: ride._id });

    return res.status(200).json({ message: "Ride cancelled successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error." });
  }
});

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

router.get("/:rideId/request", requireAuth, requireRider, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.rideId)) {
    return res.status(400).json({ message: "Invalid ride ID." });
  }

  try {
    const request = await RideRequest.findOne({
      ride: req.params.rideId,
      rider: req.user._id,
    }).select("status createdAt");

    return res.status(200).json({ request });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error." });
  }
});

router.post("/:rideId/request", requireAuth, requireRider, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.rideId)) {
    return res.status(400).json({ message: "Invalid ride ID." });
  }

  try {
    const ride = await Ride.findOne({
      _id: req.params.rideId,
      availableSeats: { $gt: 0 },
      departureTime: { $gt: new Date() },
    });

    if (!ride) {
      return res.status(404).json({ message: "This ride is no longer available." });
    }

    const existingRequest = await RideRequest.findOne({
      ride: ride._id,
      rider: req.user._id,
    });

    if (existingRequest) {
      return res.status(409).json({
        message: "You have already requested a seat for this ride.",
        request: existingRequest,
      });
    }

    const request = await RideRequest.create({
      ride: ride._id,
      rider: req.user._id,
    });

    await Notification.create({
      recipient: ride.driver,
      type: "RideRequest",
      message: `${req.user.name} requested a seat for ${ride.origin} to ${ride.destination}.`,
      ride: ride._id,
    });

    return res.status(201).json({
      message: "Seat request sent successfully.",
      request,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already requested a seat for this ride.",
      });
    }

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
