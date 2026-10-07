import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoSubmitter,
  createRegistrationController,
  createRegistrationStateMachine,
  REGISTRATION_LIMITS,
  RegistrationState,
} from "../registration.js";

const validRegistration = Object.freeze({
  fullName: "Alex Example",
  email: "alex@example.com",
});

test("allows only the declared form state transitions", () => {
  const machine = createRegistrationStateMachine();
  assert.equal(machine.getState(), RegistrationState.IDLE);
  assert.throws(() => machine.transition(RegistrationState.SUCCESS), /Invalid registration state transition/);

  machine.transition(RegistrationState.SUBMITTING);
  machine.transition(RegistrationState.ERROR);
  machine.transition(RegistrationState.SUBMITTING);
  machine.transition(RegistrationState.SUCCESS);
  assert.equal(machine.getState(), RegistrationState.SUCCESS);
  assert.throws(() => machine.transition(RegistrationState.SUBMITTING), /Invalid registration state transition/);
});

test("validates form data before entering Submitting", async () => {
  let submissionCount = 0;
  const controller = createRegistrationController({
    submitRegistration: async () => { submissionCount += 1; },
  });

  const result = await controller.submit({ fullName: "   ", email: "not-an-email" });
  assert.equal(result.accepted, false);
  assert.match(result.validationError, /full name/);
  assert.equal(controller.getState(), RegistrationState.IDLE);
  assert.equal(submissionCount, 0);
});

test("trims outer whitespace and preserves valid name punctuation and Unicode", async () => {
  let received;
  const controller = createRegistrationController({
    async submitRegistration(data) {
      received = data;
      return { ok: true };
    },
  });

  const result = await controller.submit({
    fullName: "  Zoë O'Neil-Smith  ",
    email: "  zoe@example.com  ",
  });

  assert.equal(result.state, RegistrationState.SUCCESS);
  assert.deepEqual(received, { fullName: "Zoë O'Neil-Smith", email: "zoe@example.com" });
});

test("enforces name and email length limits after trimming", async () => {
  const controller = createRegistrationController({ submitRegistration: async () => ({ ok: true }) });
  const validBoundary = await controller.submit({
    fullName: ` ${"N".repeat(REGISTRATION_LIMITS.fullName)} `,
    email: `${"a".repeat(69)}@${"b".repeat(184)}`,
  });
  assert.equal(validBoundary.state, RegistrationState.SUCCESS);

  const overlongName = await validateWithFreshController({
    fullName: "N".repeat(REGISTRATION_LIMITS.fullName + 1),
    email: "alex@example.com",
  });
  assert.equal(overlongName.validationError, `Full name must be ${REGISTRATION_LIMITS.fullName} characters or fewer.`);

  const overlongEmail = await validateWithFreshController({
    fullName: "Alex Example",
    email: `${"a".repeat(70)}@${"b".repeat(184)}`,
  });
  assert.equal(overlongEmail.validationError, `Email address must be ${REGISTRATION_LIMITS.email} characters or fewer.`);
});

async function validateWithFreshController(values) {
  const controller = createRegistrationController({ submitRegistration: async () => ({ ok: true }) });
  return controller.submit(values);
}

test("moves through Submitting to Success with the demo submitter", async () => {
  const transitions = [];
  const controller = createRegistrationController({
    submitRegistration: createDemoSubmitter({ outcome: "success", delayMs: 0 }),
    onTransition: (next, previous) => transitions.push([previous, next]),
  });

  const result = await controller.submit(validRegistration);
  assert.equal(result.accepted, true);
  assert.equal(result.state, RegistrationState.SUCCESS);
  assert.deepEqual(transitions, [
    [RegistrationState.IDLE, RegistrationState.SUBMITTING],
    [RegistrationState.SUBMITTING, RegistrationState.SUCCESS],
  ]);
});

test("moves to Error and permits a retry that succeeds", async () => {
  const transitions = [];
  let attemptCount = 0;
  const controller = createRegistrationController({
    async submitRegistration() {
      attemptCount += 1;
      if (attemptCount === 1) {
        throw new Error("Test-only simulated failure.");
      }
      return { ok: true };
    },
    onTransition: (next) => transitions.push(next),
  });

  const firstResult = await controller.submit(validRegistration);
  assert.equal(firstResult.state, RegistrationState.ERROR);
  assert.equal(controller.getState(), RegistrationState.ERROR);

  const retryResult = await controller.submit(validRegistration);
  assert.equal(retryResult.state, RegistrationState.SUCCESS);
  assert.equal(attemptCount, 2);
  assert.deepEqual(transitions, [
    RegistrationState.SUBMITTING,
    RegistrationState.ERROR,
    RegistrationState.SUBMITTING,
    RegistrationState.SUCCESS,
  ]);
});

test("the demo submitter can simulate either outcome without a service", async () => {
  const success = await createDemoSubmitter({ outcome: "success", delayMs: 0 })(validRegistration);
  assert.deepEqual(success, { ok: true, demo: true });
  await assert.rejects(
    createDemoSubmitter({ outcome: "error", delayMs: 0 })(validRegistration),
    /Simulated registration failure/,
  );
});

test("ignores rapid duplicate submissions while the first one is pending", async () => {
  let completeSubmission;
  let submissionCount = 0;
  const controller = createRegistrationController({
    submitRegistration() {
      submissionCount += 1;
      return new Promise((resolve) => { completeSubmission = resolve; });
    },
  });

  const firstSubmission = controller.submit(validRegistration);
  assert.equal(controller.getState(), RegistrationState.SUBMITTING);
  const duplicates = await Promise.all(
    Array.from({ length: 8 }, () => controller.submit(validRegistration)),
  );
  assert.ok(duplicates.every((duplicate) => duplicate.accepted === false));
  assert.ok(duplicates.every((duplicate) => duplicate.state === RegistrationState.SUBMITTING));
  assert.equal(submissionCount, 1);

  completeSubmission({ ok: true });
  const result = await firstSubmission;
  assert.equal(result.state, RegistrationState.SUCCESS);
});

test("does not treat transition notification errors as submit failures", async () => {
  const controller = createRegistrationController({
    submitRegistration: async () => ({ ok: true }),
    onTransition(state) {
      if (state === RegistrationState.SUCCESS) {
        throw new Error("Status rendering failed.");
      }
    },
  });

  await assert.rejects(controller.submit(validRegistration), /Status rendering failed/);
  assert.equal(controller.getState(), RegistrationState.SUCCESS);
});
