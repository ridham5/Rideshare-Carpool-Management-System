const mongoose = require("mongoose");

const rideRequestSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      required: true,
    },
    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

rideRequestSchema.index({ ride: 1, rider: 1 }, { unique: true });

module.exports = mongoose.model("RideRequest", rideRequestSchema);
