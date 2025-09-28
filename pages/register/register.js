/**
 * !!!
 * Registration page
 * !!!
 */

/**
 * Validates the registration form, calls the Noroff v2 auth API,
 * and redirects to login on success.
 * @file
 */

import { REGISTER_API_URL } from "../../scripts/constants.js";
import { doFetch } from "../../utils/doFetch.js";

/**
 * !!!
 * Local types
 * !!!
 */

/**
 * Shape of the register request body.
 * @typedef {Object} RegisterPayload
 * @property {string} name
 * @property {string} email
 * @property {string} password
 */

/**
 * !!!
 * DOM references
 * !!!
 */

const form = document.getElementById("register-form");
const nameEl = document.getElementById("name");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const confirmEl = document.getElementById("confirm");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("form-status");

// inline error elements
const nameErr = document.getElementById("name-error");
const emailErr = document.getElementById("email-error");
const passwordErr = document.getElementById("password-error");
const confirmErr = document.getElementById("confirm-error");

/**
 * !!!
 * Helpers
 * !!!
 */

/**
 * Check that an email is @stud.noroff.no
 * @param {string} value
 * @returns {boolean}
 */
function isStudEmail(value) {
  return value.trim().toLowerCase().endsWith("@stud.noroff.no");
}

/**
 * Validate form fields and toggle button state.
 * Shows/hides inline error messages.
 * @returns {boolean}
 */
function validate() {
  let ok = true;

  if (!nameEl.value.trim()) {
    nameErr.hidden = false;
    ok = false;
  } else {
    nameErr.hidden = true;
  }

  if (!isStudEmail(emailEl.value)) {
    emailErr.hidden = false;
    ok = false;
  } else {
    emailErr.hidden = true;
  }

  if ((passwordEl.value || "").length < 8) {
    passwordErr.hidden = false;
    ok = false;
  } else {
    passwordErr.hidden = true;
  }

  if (confirmEl.value !== passwordEl.value || !confirmEl.value) {
    confirmErr.hidden = false;
    ok = false;
  } else {
    confirmErr.hidden = true;
  }

  submitBtn.disabled = !ok;
  return ok;
}

/**
 * !!!
 * Wire up validation and submit
 * !!!
 */

// live validation
[nameEl, emailEl, passwordEl, confirmEl].forEach((el) =>
  el.addEventListener("input", validate)
);
validate(); // initial state

form.addEventListener(
  "submit",
  /** @param {SubmitEvent} e */ async (e) => {
    e.preventDefault();
    statusEl.textContent = "";
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating…";

    /** @type {RegisterPayload} */
    const payload = {
      name: nameEl.value.trim(),
      email: emailEl.value.trim(),
      password: passwordEl.value,
    };

    try {
      const { ok, data, status } = await doFetch(
        REGISTER_API_URL,
        { method: "POST", body: JSON.stringify(payload) },
        false
      );

      if (!ok) {
        const msg =
          data?.errors?.[0]?.message ||
          data?.message ||
          `Register failed (${status || "unknown"})`;

        if (msg.includes("Profile already exists")) {
          statusEl.textContent = "Profile already exists. Try logging in.";
        } else {
          statusEl.textContent = msg;
        }

        submitBtn.disabled = false;
        submitBtn.textContent = "Create account";
        return;
      }

      statusEl.textContent = "Account created. Redirecting to login…";
      setTimeout(() => {
        const q = new URLSearchParams({
          registered: "1",
          email: payload.email,
        }).toString();
        window.location.href = `/pages/login/login.html?${q}`;
      }, 700);
    } catch {
      statusEl.textContent = "Network error. Please try again.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
    }
  }
);
