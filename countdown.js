const UTC_ISO_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/;
const SECONDS_PER_DAY = 24 * 60 * 60;

export function parseUtcIsoTimestamp(value) {
  const match = typeof value === "string" ? UTC_ISO_TIMESTAMP.exec(value) : null;
  if (!match) {
    throw new RangeError("Countdown target must be a valid ISO 8601 UTC timestamp ending in Z.");
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction = ""] = match;
  const timestamp = Date.parse(value);
  const date = new Date(timestamp);
  const expected = {
    year: Number(yearText),
    month: Number(monthText) - 1,
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
    second: Number(secondText),
    millisecond: Number(fraction.padEnd(3, "0")),
  };

  const isValidDate = Number.isFinite(timestamp)
    && date.getUTCFullYear() === expected.year
    && date.getUTCMonth() === expected.month
    && date.getUTCDate() === expected.day
    && date.getUTCHours() === expected.hour
    && date.getUTCMinutes() === expected.minute
    && date.getUTCSeconds() === expected.second
    && date.getUTCMilliseconds() === expected.millisecond;

  if (!isValidDate) {
    throw new RangeError("Countdown target must be a valid ISO 8601 UTC timestamp ending in Z.");
  }

  return timestamp;
}

function calculateRemaining(targetTimestamp, nowTimestamp) {
  if (!Number.isFinite(nowTimestamp)) {
    throw new TypeError("The countdown clock must return a finite timestamp in milliseconds.");
  }

  const totalSeconds = Math.floor(Math.max(0, targetTimestamp - nowTimestamp) / 1000);
  return Object.freeze({
    days: Math.floor(totalSeconds / SECONDS_PER_DAY),
    hours: Math.floor((totalSeconds % SECONDS_PER_DAY) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: nowTimestamp >= targetTimestamp,
  });
}

/** Calculate remaining time from an absolute UTC target and the current timestamp. */
export function getRemainingTime(targetUtc, nowTimestamp = Date.now()) {
  return calculateRemaining(parseUtcIsoTimestamp(targetUtc), nowTimestamp);
}

/** Create a single-timer countdown controller, independent of the DOM and form. */
export function createCountdownController({
  now = () => Date.now(),
  setIntervalFn = (callback, delay) => globalThis.setInterval(callback, delay),
  clearIntervalFn = (timerId) => globalThis.clearInterval(timerId),
} = {}) {
  let timerId = null;
  let generation = 0;

  function clearTimer() {
    if (timerId !== null) {
      clearIntervalFn(timerId);
      timerId = null;
    }
  }

  function dispose() {
    generation += 1;
    clearTimer();
  }

  function start(targetUtc, {
    onUpdate,
    onExpire,
    intervalMs = 1000,
  } = {}) {
    dispose();

    const targetTimestamp = parseUtcIsoTimestamp(targetUtc);
    if (typeof onUpdate !== "function") {
      throw new TypeError("start requires an onUpdate callback.");
    }
    if (onExpire !== undefined && typeof onExpire !== "function") {
      throw new TypeError("onExpire must be a function when provided.");
    }
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      throw new RangeError("intervalMs must be a positive finite number.");
    }

    const thisGeneration = generation;
    let expired = false;

    const update = () => {
      if (thisGeneration !== generation) {
        return;
      }

      let remaining;
      try {
        remaining = calculateRemaining(targetTimestamp, now());
        onUpdate(remaining);
      } catch (error) {
        if (thisGeneration === generation) {
          generation += 1;
          clearTimer();
        }
        throw error;
      }

      if (thisGeneration !== generation || !remaining.expired) {
        return;
      }

      expired = true;
      clearTimer();
      generation += 1;
      onExpire?.(remaining);
    };

    update();
    if (thisGeneration === generation && !expired) {
      timerId = setIntervalFn(update, intervalMs);
    }

    return () => {
      if (thisGeneration === generation) {
        dispose();
      }
    };
  }

  return Object.freeze({ start, dispose });
}
