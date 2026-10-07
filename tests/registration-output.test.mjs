import assert from "node:assert/strict";
import test from "node:test";

test("renders an HTML-shaped name as text without invoking HTML sinks", async () => {
  const payload = "<img src=x onerror=alert(1)>";
  let alertCalls = 0;
  let unsafeHtmlWrites = 0;
  let submitHandler;
  const scheduledTimeouts = [];

  function element(extra = {}) {
    return new Proxy({ dataset: {}, textContent: "", ...extra }, {
      set(target, property, value) {
        if (property === "innerHTML" || property === "outerHTML") {
          unsafeHtmlWrites += 1;
        }
        return Reflect.set(target, property, value);
      },
      get(target, property, receiver) {
        if (property === "insertAdjacentHTML") {
          return () => { unsafeHtmlWrites += 1; };
        }
        return Reflect.get(target, property, receiver);
      },
    });
  }

  const countdownTarget = element();
  const countdownStatus = element();
  const form = element({
    reportValidity: () => true,
    addEventListener(type, handler) {
      if (type === "submit") submitHandler = handler;
    },
  });
  const submitButton = element({ disabled: false });
  const formStatus = element();
  const formStatusMessage = element();
  const countdownParts = ["days", "hours", "minutes", "seconds"].map((part) =>
    element({ dataset: { countdownPart: part } }));

  const originalGlobals = new Map();
  const replaceGlobal = (name, value) => {
    originalGlobals.set(name, {
      existed: Object.hasOwn(globalThis, name),
      value: globalThis[name],
    });
    globalThis[name] = value;
  };

  replaceGlobal("document", {
    querySelector(selector) {
      return new Map([
        ["#countdown-target", countdownTarget],
        ["#countdown-status", countdownStatus],
        ["#registration-form", form],
        ["#registration-submit", submitButton],
        ["#form-status", formStatus],
        ["#form-status-message", formStatusMessage],
      ]).get(selector) ?? null;
    },
    querySelectorAll: () => countdownParts,
  });
  replaceGlobal("FormData", class {
    get(name) {
      return name === "fullName" ? payload : name === "email" ? "alex@example.com" : null;
    }
  });
  replaceGlobal("setInterval", () => 1);
  replaceGlobal("clearInterval", () => {});
  replaceGlobal("setTimeout", (callback) => {
    scheduledTimeouts.push(callback);
    return 1;
  });
  replaceGlobal("alert", () => { alertCalls += 1; });

  try {
    await import("../app.js?slice3-xss-check");
    assert.equal(typeof submitHandler, "function");

    let prevented = false;
    const firstSubmission = submitHandler({ preventDefault() { prevented = true; } });
    assert.equal(submitButton.disabled, true, "the submit control is disabled during Submitting");
    assert.equal(scheduledTimeouts.length, 1);

    await submitHandler({ preventDefault() {} });
    assert.equal(scheduledTimeouts.length, 1, "a rapid duplicate does not schedule another submission");

    scheduledTimeouts[0]();
    await firstSubmission;

    assert.equal(prevented, true);
    assert.equal(formStatusMessage.textContent,
      `Success — demo complete for ${payload}; no data was sent to a server.`);
    assert.equal(alertCalls, 0);
    assert.equal(unsafeHtmlWrites, 0);
  } finally {
    for (const [name, original] of originalGlobals) {
      if (original.existed) {
        globalThis[name] = original.value;
      } else {
        delete globalThis[name];
      }
    }
  }
});
