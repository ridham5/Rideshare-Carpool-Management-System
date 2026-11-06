const assert = require("node:assert/strict");
const { beforeEach, describe, it } = require("node:test");

const ridesRouter = require("../routes/rides");
const Ride = require("../models/Ride");
const RideRequest = require("../models/RideRequest");
const Notification = require("../models/Notification");
const { requireRider } = require("../middleware/auth");

const driverId = "507f1f77bcf86cd799439011";
const riderId = "507f1f77bcf86cd799439012";
const otherDriverId = "507f1f77bcf86cd799439013";
const rideId = "507f1f77bcf86cd799439014";
const requestId = "507f1f77bcf86cd799439015";

function routeHandler(method, path) {
  const layer = ridesRouter.stack.find(
    (entry) => entry.route && entry.route.path === path && entry.route.methods[method]
  );
  assert.ok(layer, `Route ${method.toUpperCase()} ${path} was not found`);
  return layer.route.stack.at(-1).handle;
}

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function futureRide(overrides = {}) {
  return {
    _id: rideId,
    driver: driverId,
    origin: "Campus",
    destination: "Downtown",
    departureTime: new Date(Date.now() + 60 * 60 * 1000),
    availableSeats: 2,
    ...overrides,
  };
}

function queryReturning(value) {
  return {
    populate: async () => value,
  };
}

beforeEach(() => {
  Ride.findOne = async () => futureRide();
  Ride.findOneAndUpdate = async () => futureRide({ availableSeats: 1 });
  Ride.findByIdAndUpdate = async () => undefined;
  RideRequest.findOne = async () => null;
  RideRequest.create = async (data) => ({ _id: requestId, status: "Pending", ...data });
  RideRequest.findOneAndUpdate = () =>
    queryReturning({ _id: requestId, status: "Approved", rider: { _id: riderId } });
  Notification.create = async (data) => data;
});

describe("US07 - rider requests a seat", () => {
  it("creates a pending request for an available future ride", async () => {
    const handler = routeHandler("post", "/:rideId/request");
    const req = {
      params: { rideId },
      user: { _id: riderId, name: "Rider", role: "Rider" },
    };
    const res = response();

    await handler(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.message, "Seat request sent successfully.");
    assert.equal(res.body.request.status, "Pending");
    assert.equal(res.body.request.ride, rideId);
    assert.equal(res.body.request.rider, riderId);
  });

  it("rejects requesting the same ride twice", async () => {
    RideRequest.findOne = async () => ({ _id: requestId, status: "Pending" });
    const res = response();

    await routeHandler("post", "/:rideId/request")(
      { params: { rideId }, user: { _id: riderId, name: "Rider" } },
      res
    );

    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /already requested/i);
  });

  it("rejects a ride with no available seats", async () => {
    Ride.findOne = async () => null;
    const res = response();

    await routeHandler("post", "/:rideId/request")(
      { params: { rideId }, user: { _id: riderId, name: "Rider" } },
      res
    );

    assert.equal(res.statusCode, 404);
    assert.match(res.body.message, /no longer available/i);
  });

  it("rejects a departed ride", async () => {
    Ride.findOne = async () => null;
    const res = response();

    await routeHandler("post", "/:rideId/request")(
      { params: { rideId }, user: { _id: riderId, name: "Rider" } },
      res
    );

    assert.equal(res.statusCode, 404);
    assert.match(res.body.message, /no longer available/i);
  });

  it("does not allow a driver to request a seat", () => {
    const res = response();
    const next = () => {
      throw new Error("Driver was allowed through rider authorization");
    };

    requireRider({ user: { role: "Driver" } }, res, next);

    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /only riders/i);
  });
});

describe("US08 - driver manages pending requests", () => {
  it("approves a pending request and decrements available seats", async () => {
    const ride = futureRide();
    const request = { _id: requestId, ride, status: "Pending" };
    RideRequest.findOne = () => queryReturning(request);
    const update = { _id: requestId, status: "Approved", rider: { _id: riderId } };
    RideRequest.findOneAndUpdate = () => queryReturning(update);
    const res = response();

    await routeHandler("patch", "/driver/requests/:requestId")(
      { params: { requestId }, body: { status: "Approved" }, user: { _id: driverId } },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.match(res.body.message, /approved successfully/i);
    assert.equal(res.body.request.status, "Approved");
  });

  it("rejects a pending request without changing ride capacity", async () => {
    const ride = futureRide();
    RideRequest.findOne = () =>
      queryReturning({ _id: requestId, ride, status: "Pending" });
    const update = { _id: requestId, status: "Rejected", rider: { _id: riderId } };
    RideRequest.findOneAndUpdate = () => queryReturning(update);
    let capacityUpdates = 0;
    Ride.findOneAndUpdate = async () => {
      capacityUpdates += 1;
      return futureRide({ availableSeats: 1 });
    };
    const res = response();

    await routeHandler("patch", "/driver/requests/:requestId")(
      { params: { requestId }, body: { status: "Rejected" }, user: { _id: driverId } },
      res
    );

    assert.equal(res.statusCode, 200);
    assert.match(res.body.message, /rejected successfully/i);
    assert.equal(capacityUpdates, 0);
  });

  it("rejects approval when the ride has zero available seats", async () => {
    RideRequest.findOne = () =>
      queryReturning({ _id: requestId, ride: futureRide(), status: "Pending" });
    Ride.findOneAndUpdate = async () => null;
    const res = response();

    await routeHandler("patch", "/driver/requests/:requestId")(
      { params: { requestId }, body: { status: "Approved" }, user: { _id: driverId } },
      res
    );

    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /no available seats/i);
  });

  it("does not let a driver act on another driver's ride", async () => {
    RideRequest.findOne = () =>
      queryReturning({ _id: requestId, ride: null, status: "Pending" });
    const res = response();

    await routeHandler("patch", "/driver/requests/:requestId")(
      { params: { requestId }, body: { status: "Approved" }, user: { _id: driverId } },
      res
    );

    assert.equal(res.statusCode, 404);
    assert.match(res.body.message, /no longer available/i);
  });
});
