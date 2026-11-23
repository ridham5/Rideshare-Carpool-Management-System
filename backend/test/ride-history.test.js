const assert = require("node:assert/strict");
const { beforeEach, describe, it } = require("node:test");

const ridesRouter = require("../routes/rides");
const Ride = require("../models/Ride");
const RideRequest = require("../models/RideRequest");

const driverId = "507f1f77bcf86cd799439011";
const riderId = "507f1f77bcf86cd799439012";

function historyHandler() {
  const layer = ridesRouter.stack.find(
    (entry) => entry.route && entry.route.path === "/history" && entry.route.methods.get
  );
  assert.ok(layer, "Route GET /history was not found");
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

function queryReturning(value) {
  return {
    populate() {
      return this;
    },
    sort() {
      return Promise.resolve(value);
    },
  };
}

beforeEach(() => {
  Ride.find = async () => [];
  RideRequest.find = async () => [];
});

describe("GET /history", () => {
  it("returns a driver's past rides newest first", async () => {
    const rides = [
      { _id: "newer", departureTime: new Date("2024-02-01T10:00:00Z") },
      { _id: "older", departureTime: new Date("2024-01-01T10:00:00Z") },
    ];
    let query;
    Ride.find = (value) => {
      query = value;
      return queryReturning(rides);
    };
    const res = response();

    await historyHandler()({ user: { _id: driverId, role: "Driver" } }, res);

    assert.equal(query.driver, driverId);
    assert.ok(query.departureTime.$lte instanceof Date);
    assert.deepEqual(res.body.trips.map(({ ride, role, status }) => ({
      id: ride._id,
      role,
      status,
    })), [
      { id: "newer", role: "Driver", status: "Completed" },
      { id: "older", role: "Driver", status: "Completed" },
    ]);
  });

  it("returns approved past rider trips ordered by departure time", async () => {
    const earlierRide = {
      _id: "earlier",
      departureTime: new Date("2024-01-01T10:00:00Z"),
      driver: { name: "Driver One" },
    };
    const laterRide = {
      _id: "later",
      departureTime: new Date("2024-02-01T10:00:00Z"),
      driver: { name: "Driver Two" },
    };
    let query;
    RideRequest.find = (value) => {
      query = value;
      return queryReturning([
        { ride: earlierRide },
        { ride: null },
        { ride: laterRide },
      ]);
    };
    const res = response();

    await historyHandler()({ user: { _id: riderId, role: "Rider" } }, res);

    assert.deepEqual(query, { rider: riderId, status: "Approved" });
    assert.deepEqual(res.body.trips.map(({ ride, role, status }) => ({
      id: ride._id,
      role,
      status,
    })), [
      { id: "later", role: "Rider", status: "Completed" },
      { id: "earlier", role: "Rider", status: "Completed" },
    ]);
  });

  it("does not return a driver's upcoming rides in history", async () => {
    let query;
    Ride.find = (value) => {
      query = value;
      return queryReturning([]);
    };
    const res = response();

    await historyHandler()({ user: { _id: driverId, role: "Driver" } }, res);

    assert.equal(query.driver, driverId);
    assert.ok(query.departureTime.$lte instanceof Date);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.trips, []);
  });

  it("does not return approved upcoming rides in rider history", async () => {
    let query;
    let population;
    RideRequest.find = (value) => {
      query = value;
      return {
        populate(options) {
          population = options;
          return this;
        },
        sort() {
          return Promise.resolve([{ ride: null }]);
        },
      };
    };
    const res = response();

    await historyHandler()({ user: { _id: riderId, role: "Rider" } }, res);

    assert.deepEqual(query, { rider: riderId, status: "Approved" });
    assert.equal(population.path, "ride");
    assert.ok(population.match.departureTime.$lte instanceof Date);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.trips, []);
  });

  it("returns an empty list when a driver has no past rides", async () => {
    Ride.find = () => queryReturning([]);
    const res = response();

    await historyHandler()({ user: { _id: driverId, role: "Driver" } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { trips: [] });
  });

  it("returns an empty list when a rider has no completed bookings", async () => {
    RideRequest.find = () => queryReturning([]);
    const res = response();

    await historyHandler()({ user: { _id: riderId, role: "Rider" } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { trips: [] });
  });

  it("returns 500 when history lookup fails", async () => {
    Ride.find = () => {
      throw new Error("Database unavailable");
    };
    const res = response();

    await historyHandler()({ user: { _id: driverId, role: "Driver" } }, res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { message: "Server error." });
  });
});
