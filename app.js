import { COUNTDOWN_TARGET_UTC } from "./countdown-config.js";
import { createCountdownController } from "./countdown.js";
import {
  createDemoSubmitter,
  createRegistrationController,
  RegistrationState,
} from "./registration.js";

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

const registrationForm = document.querySelector("#registration-form");
const registrationSubmitButton = document.querySelector("#registration-submit");
const registrationStatus = document.querySelector("#form-status");
const registrationStatusMessage = document.querySelector("#form-status-message");

if (!registrationForm || !registrationSubmitButton || !registrationStatus || !registrationStatusMessage) {
  throw new Error("Registration form markup is incomplete.");
}

const registrationMessages = Object.freeze({
  [RegistrationState.IDLE]: "Idle — ready for a demo submission.",
  [RegistrationState.SUBMITTING]: "Submitting demo registration…",
  [RegistrationState.SUCCESS]: "Success — demo complete; no data was sent to a server.",
  [RegistrationState.ERROR]: "Error — the demo submission failed. You can try again.",
});

const registrationController = createRegistrationController({
  submitRegistration: createDemoSubmitter({ outcome: "success" }),
  onTransition(state) {
    registrationStatus.dataset.state = state.toLowerCase();
    registrationStatusMessage.textContent = registrationMessages[state];
    registrationSubmitButton.disabled = state === RegistrationState.SUBMITTING
      || state === RegistrationState.SUCCESS;
  },
});

registrationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!registrationForm.reportValidity()) {
    return;
  }

  const formData = new FormData(registrationForm);
  const fullName = formData.get("fullName");
  const result = await registrationController.submit({
    fullName,
    email: formData.get("email"),
  });

  if (result.validationError) {
    registrationStatusMessage.textContent = result.validationError;
  } else if (result.state === RegistrationState.SUCCESS) {
    const submittedName = typeof fullName === "string" ? fullName.trim() : "";
    registrationStatusMessage.textContent = `Success — demo complete for ${submittedName}; no data was sent to a server.`;
  }
});
