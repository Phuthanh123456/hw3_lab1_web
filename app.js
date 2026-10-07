import { COUNTDOWN_TARGET_UTC } from "./countdown-config.js";
import { createCountdownController } from "./countdown.js";

const countdownTarget = document.querySelector("#countdown-target");
const countdownStatus = document.querySelector("#countdown-status");
const countdownParts = new Map(
  Array.from(document.querySelectorAll("[data-countdown-part]"), (element) => [
    element.dataset.countdownPart,
    element,
  ]),
);
const requiredParts = ["days", "hours", "minutes", "seconds"];

if (!countdownTarget || !countdownStatus || requiredParts.some((part) => !countdownParts.has(part))) {
  throw new Error("Countdown markup is incomplete.");
}

countdownTarget.dateTime = COUNTDOWN_TARGET_UTC;
countdownTarget.textContent = COUNTDOWN_TARGET_UTC;

const countdown = createCountdownController();
countdown.start(COUNTDOWN_TARGET_UTC, {
  onUpdate(remaining) {
    for (const part of requiredParts) {
      countdownParts.get(part).textContent = String(remaining[part]).padStart(2, "0");
    }
  },
  onExpire() {
    countdownStatus.textContent = "The countdown has ended.";
  },
});
