export const RegistrationState = Object.freeze({
  IDLE: "Idle",
  SUBMITTING: "Submitting",
  SUCCESS: "Success",
  ERROR: "Error",
});

const VALID_TRANSITIONS = new Map([
  [RegistrationState.IDLE, new Set([RegistrationState.SUBMITTING])],
  [RegistrationState.SUBMITTING, new Set([RegistrationState.SUCCESS, RegistrationState.ERROR])],
  [RegistrationState.SUCCESS, new Set()],
  [RegistrationState.ERROR, new Set([RegistrationState.SUBMITTING])],
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/u;
export const REGISTRATION_LIMITS = Object.freeze({ fullName: 100, email: 254 });

export function createRegistrationStateMachine({ onTransition = () => {} } = {}) {
  if (typeof onTransition !== "function") {
    throw new TypeError("onTransition must be a function.");
  }

  let state = RegistrationState.IDLE;

  function transition(nextState) {
    if (!VALID_TRANSITIONS.get(state)?.has(nextState)) {
      throw new Error(`Invalid registration state transition: ${state} -> ${nextState}.`);
    }

    const previousState = state;
    state = nextState;
    onTransition(state, previousState);
    return state;
  }

  return Object.freeze({
    getState: () => state,
    transition,
  });
}

export function validateRegistrationData(values) {
  const fullName = typeof values?.fullName === "string" ? values.fullName.trim() : "";
  const email = typeof values?.email === "string" ? values.email.trim() : "";

  if (!fullName) {
    return Object.freeze({ valid: false, message: "Enter your full name." });
  }
  if (!email) {
    return Object.freeze({ valid: false, message: "Enter your email address." });
  }
  if (fullName.length > REGISTRATION_LIMITS.fullName) {
    return Object.freeze({ valid: false, message: `Full name must be ${REGISTRATION_LIMITS.fullName} characters or fewer.` });
  }
  if (email.length > REGISTRATION_LIMITS.email) {
    return Object.freeze({ valid: false, message: `Email address must be ${REGISTRATION_LIMITS.email} characters or fewer.` });
  }
  if (!EMAIL_PATTERN.test(email)) {
    return Object.freeze({ valid: false, message: "Enter a valid email address." });
  }

  return Object.freeze({
    valid: true,
    data: Object.freeze({ fullName, email }),
  });
}

/** Return a local-only submit function whose outcome can be selected in tests. */
export function createDemoSubmitter({
  outcome = "success",
  delayMs = 450,
  setTimeoutFn = (callback, delay) => globalThis.setTimeout(callback, delay),
} = {}) {
  if (outcome !== "success" && outcome !== "error") {
    throw new RangeError('Demo outcome must be "success" or "error".');
  }
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new RangeError("delayMs must be a non-negative finite number.");
  }
  if (typeof setTimeoutFn !== "function") {
    throw new TypeError("setTimeoutFn must be a function.");
  }

  return function submitRegistrationDemo() {
    return new Promise((resolve, reject) => {
      setTimeoutFn(() => {
        if (outcome === "error") {
          reject(new Error("Simulated registration failure."));
          return;
        }
        resolve(Object.freeze({ ok: true, demo: true }));
      }, delayMs);
    });
  };
}

export function createRegistrationController({
  submitRegistration = createDemoSubmitter(),
  validate = validateRegistrationData,
  onTransition = () => {},
} = {}) {
  if (typeof submitRegistration !== "function") {
    throw new TypeError("submitRegistration must be a function.");
  }
  if (typeof validate !== "function") {
    throw new TypeError("validate must be a function.");
  }

  const stateMachine = createRegistrationStateMachine({ onTransition });

  async function submit(values) {
    const currentState = stateMachine.getState();
    if (currentState === RegistrationState.SUBMITTING || currentState === RegistrationState.SUCCESS) {
      return Object.freeze({ accepted: false, state: currentState });
    }

    const validation = validate(values);
    if (!validation?.valid) {
      return Object.freeze({
        accepted: false,
        state: currentState,
        validationError: validation?.message ?? "Check the registration fields.",
      });
    }

    stateMachine.transition(RegistrationState.SUBMITTING);
    let result;
    try {
      result = await submitRegistration(validation.data);
    } catch (error) {
      stateMachine.transition(RegistrationState.ERROR);
      return Object.freeze({ accepted: true, state: RegistrationState.ERROR, error });
    }

    stateMachine.transition(RegistrationState.SUCCESS);
    return Object.freeze({ accepted: true, state: RegistrationState.SUCCESS, result });
  }

  return Object.freeze({
    getState: stateMachine.getState,
    submit,
  });
}
