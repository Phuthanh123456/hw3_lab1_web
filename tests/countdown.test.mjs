import assert from "node:assert/strict";
import test from "node:test";
import {
  createCountdownController,
  getRemainingTime,
  parseUtcIsoTimestamp,
} from "../countdown.js";

test("accepts a valid ISO 8601 UTC timestamp ending in Z", () => {
  assert.equal(parseUtcIsoTimestamp("2026-12-31T23:59:59Z"), Date.parse("2026-12-31T23:59:59Z"));
  assert.equal(parseUtcIsoTimestamp("2026-12-31T23:59:59.125Z"), Date.parse("2026-12-31T23:59:59.125Z"));
  assert.equal(parseUtcIsoTimestamp("2026-12-31T23:59:59.123456Z"), Date.UTC(2026, 11, 31, 23, 59, 59, 123));
});

test("rejects invalid dates and timestamps without an explicit Z timezone", () => {
  for (const value of [
    "2026-02-30T12:00:00Z",
    "2026-12-31T23:59:59",
    "2026-12-31T23:59:59+00:00",
    "not-a-timestamp",
    "",
  ]) {
    assert.throws(() => parseUtcIsoTimestamp(value), /valid ISO 8601 UTC timestamp ending in Z/);
  }
});

test("calculates days, hours, minutes, and seconds from target minus now", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  assert.deepEqual(getRemainingTime("2026-01-03T03:04:05Z", now), {
    days: 2,
    hours: 3,
    minutes: 4,
    seconds: 5,
    expired: false,
  });
});

test("reports an elapsed target as expired with all parts at zero", () => {
  const target = Date.parse("2026-01-01T00:00:00Z");
  assert.deepEqual(getRemainingTime("2026-01-01T00:00:00Z", target + 1), {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    expired: true,
  });
});

test("restarts with one timer and disposes the active timer", () => {
  let now = Date.parse("2026-01-01T00:00:00Z");
  let nextTimerId = 0;
  const activeTimers = new Map();
  const clearedTimers = [];
  const controller = createCountdownController({
    now: () => now,
    setIntervalFn(callback, delay) {
      const id = ++nextTimerId;
      activeTimers.set(id, { callback, delay });
      return id;
    },
    clearIntervalFn(id) {
      activeTimers.delete(id);
      clearedTimers.push(id);
    },
  });

  const firstUpdates = [];
  const secondUpdates = [];
  controller.start("2026-01-01T00:00:10Z", { onUpdate: (remaining) => firstUpdates.push(remaining) });
  const staleCallback = activeTimers.get(1).callback;
  controller.start("2026-01-01T00:00:20Z", { onUpdate: (remaining) => secondUpdates.push(remaining) });
  assert.equal(activeTimers.size, 1);
  assert.deepEqual(clearedTimers, [1]);
  assert.equal(activeTimers.get(2).delay, 1000);
  assert.equal(secondUpdates[0].seconds, 20, "the replacement target is used immediately");
  staleCallback();
  assert.equal(firstUpdates.length, 1, "a stale callback from the previous target is ignored");

  now += 7000;
  activeTimers.get(2).callback();
  assert.equal(secondUpdates.at(-1).seconds, 13);

  controller.dispose();
  assert.equal(activeTimers.size, 0);
  assert.deepEqual(clearedTimers, [1, 2]);
});

test("updates from the current clock and stops its timer at expiry", () => {
  const target = Date.parse("2026-01-01T00:01:00Z");
  let now = target - 60000;
  let timerCallback;
  let activeTimer = false;
  let clearCount = 0;
  let expiryCount = 0;
  const updates = [];
  const controller = createCountdownController({
    now: () => now,
    setIntervalFn(callback) {
      timerCallback = callback;
      activeTimer = true;
      return 7;
    },
    clearIntervalFn() {
      activeTimer = false;
      clearCount += 1;
    },
  });

  controller.start("2026-01-01T00:01:00Z", {
    onUpdate: (remaining) => updates.push(remaining),
    onExpire: () => { expiryCount += 1; },
  });
  assert.equal(updates[0].minutes, 1);
  assert.equal(updates[0].seconds, 0);

  now = target - 20000;
  timerCallback();
  assert.equal(updates[1].seconds, 20, "a delayed tick recalculates from the current clock");

  now = target;
  timerCallback();
  assert.equal(updates[2].expired, true);
  assert.equal(activeTimer, false);
  assert.equal(clearCount, 1);
  assert.equal(expiryCount, 1);

  timerCallback();
  assert.equal(updates.length, 3, "a stale callback after expiry is ignored");
  assert.equal(expiryCount, 1);
});

test("an already elapsed target expires immediately without creating a timer", () => {
  const updates = [];
  let scheduledCount = 0;
  let expiryCount = 0;
  const controller = createCountdownController({
    now: () => Date.parse("2026-01-01T00:00:01Z"),
    setIntervalFn() {
      scheduledCount += 1;
      return 1;
    },
    clearIntervalFn() {},
  });

  controller.start("2026-01-01T00:00:00Z", {
    onUpdate: (remaining) => updates.push(remaining),
    onExpire: () => { expiryCount += 1; },
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0].expired, true);
  assert.equal(scheduledCount, 0);
  assert.equal(expiryCount, 1);
});
