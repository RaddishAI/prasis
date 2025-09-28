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
 * Keeping this here so the submit handler has typed payload.
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
const statusEl = document.getElementById("register-status"); // was form-status

// inline error elements (one per field)
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
 * !!!
 * Validation
 * !!!
 */

/**
 * Validate form fields and toggle button state.
 * Also keeps aria-invalid in sync with visible errors.
 * @returns {boolean} true when all fields pass
 */
function validate() {
  let ok = true;

  // name: required
  const nameBad = !nameEl.value.trim();
  nameErr.hidden = !nameBad;
  nameEl.setAttribute("aria-invalid", String(nameBad));
  if (nameBad) ok = false;

  // email: must be @stud.noroff.no
  const emailBad = !isStudEmail(emailEl.value);
  emailErr.hidden = !emailBad;
  emailEl.setAttribute("aria-invalid", String(emailBad));
  if (emailBad) ok = false;

  // password: min 8 chars
  const pwBad = (passwordEl.value || "").length < 8;
  passwordErr.hidden = !pwBad;
  passwordEl.setAttribute("aria-invalid", String(pwBad));
  if (pwBad) ok = false;

  // confirm: must match password and not be empty
  const confirmBad = confirmEl.value !== passwordEl.value || !confirmEl.value;
  confirmErr.hidden = !confirmBad;
  confirmEl.setAttribute("aria-invalid", String(confirmBad));
  if (confirmBad) ok = false;

  // final control of CTA
  submitBtn.disabled = !ok;
  return ok;
}

/**
 * !!!
 * Wire up validation and submit
 * !!!
 */

// live validation (typing + leaving field helps catch paste/tab cases)
[nameEl, emailEl, passwordEl, confirmEl].forEach((el) => {
  el.addEventListener("input", validate);
  el.addEventListener("blur", validate);
});

// initial state on load
validate();

form.addEventListener(
  "submit",
  /** @param {SubmitEvent} e */ async (e) => {
    e.preventDefault();
    statusEl.textContent = "";

    // avoid API call when invalid
    if (!validate()) {
      statusEl.textContent = "Please fix the highlighted fields.";
      return;
    }

    // basic UI feedback while waiting
    submitBtn.disabled = true;
    const prevLabel = submitBtn.textContent;
    submitBtn.textContent = "Creating…";

    /** @type {RegisterPayload} */
    const payload = {
      name: nameEl.value.trim(),
      email: emailEl.value.trim(),
      password: passwordEl.value,
    };

    try {
      // using existing doFetch util; no auth header needed for register
      const { ok, data, status } = await doFetch(
        REGISTER_API_URL,
        { method: "POST", body: JSON.stringify(payload) },
        false
      );

      if (!ok) {
        // try to surface something human from API
        const msg =
          data?.errors?.[0]?.message ||
          data?.message ||
          `Register failed (${status || "unknown"})`;

        if (msg.includes("Profile already exists")) {
          statusEl.textContent = "Profile already exists. Try logging in.";
        } else {
          statusEl.textContent = msg;
        }

        submitBtn.textContent = prevLabel;
        submitBtn.disabled = false;
        return;
      }

      // success: tiny delay to let users read the message
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
      submitBtn.textContent = prevLabel;
      submitBtn.disabled = false;
    }
  }
);
