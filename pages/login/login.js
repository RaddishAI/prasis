/**
 * !!!
 * Login page
 * !!!
 */

/**
 * Validates the login form, calls the Noroff v2 auth API,
 * stores the session, and redirects to /index.html.
 * @file
 */

import { LOGIN_API_URL, ACCESS_TOKEN_KEY } from "../../scripts/constants.js";
import { doFetch } from "../../utils/doFetch.js";

/**
 * !!!
 * Local types
 * !!!
 */

/**
 * Shape of the login request body.
 * @typedef {Object} LoginPayload
 * @property {string} email
 * @property {string} password
 */

/**
 * Minimal user profile we keep client-side.
 * @typedef {Object} UserProfile
 * @property {string} name
 * @property {string} email
 * @property {string|null} avatar
 * @property {number} credits
 */

/**
 * !!!
 * DOM references
 * !!!
 */

// form + controls
const form = document.getElementById("login-form");
const emailEl = document.getElementById("email");
const passwordEl = document.getElementById("password");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("form-status");

// inline error elements
const emailErr = document.getElementById("email-error");
const passwordErr = document.getElementById("password-error");

/**
 * !!!
 * Helpers
 * !!!
 */

/**
 * Prefill the email field from ?email= in the URL.
 * @returns {void}
 */
(function prefillFromQuery() {
  const params = new URLSearchParams(location.search);
  const email = params.get("email");
  if (email) emailEl.value = email;
})();

/**
 * Set aria-invalid state on an input.
 * @param {HTMLInputElement} input
 * @param {boolean} ok
 * @returns {void}
 */
function setFieldValidity(input, ok) {
  input.setAttribute("aria-invalid", ok ? "false" : "true");
}

/**
 * Validate current form state and toggle submit availability.
 * Also updates inline error visibility and ARIA validity.
 * @returns {boolean} true when form is valid
 */
function validate() {
  let ok = true;

  if (!emailEl.value.trim()) {
    emailErr.hidden = false;
    setFieldValidity(emailEl, false);
    ok = false;
  } else {
    emailErr.hidden = true;
    setFieldValidity(emailEl, true);
  }

  if (!passwordEl.value) {
    passwordErr.hidden = false;
    setFieldValidity(passwordEl, false);
    ok = false;
  } else {
    passwordErr.hidden = true;
    setFieldValidity(passwordEl, true);
  }

  submitBtn.disabled = !ok;
  return ok;
}

/**
 * !!!
 * Wire up validation and submit
 * !!!
 */

// initial/live validation
[emailEl, passwordEl].forEach((el) => el.addEventListener("input", validate));
validate(); // initial state

form.addEventListener(
  "submit",
  /** @param {SubmitEvent} e */ async (e) => {
    e.preventDefault();
    statusEl.textContent = "";
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in…";

    /** @type {LoginPayload} */
    const payload = {
      email: emailEl.value.trim(),
      password: passwordEl.value,
    };

    try {
      const { ok, data, status } = await doFetch(
        LOGIN_API_URL,
        { method: "POST", body: JSON.stringify(payload) },
        false
      );

      if (!ok) {
        const msg =
          data?.errors?.[0]?.message ||
          data?.message ||
          `Login failed (${status || "unknown"})`;
        statusEl.textContent = msg;
        submitBtn.disabled = false;
        submitBtn.textContent = "Log in";
        return;
      }

      const accessToken = data?.data?.accessToken;

      /** @type {UserProfile} */
      const profile = {
        name: data?.data?.name,
        email: data?.data?.email,
        avatar: data?.data?.avatar || null,
        credits: data?.data?.credits,
      };

      if (!accessToken) {
        statusEl.textContent = "Missing access token in response.";
        submitBtn.disabled = false;
        submitBtn.textContent = "Log in";
        return;
      }

      // persist session
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem("userDetails", JSON.stringify(profile));

      statusEl.textContent = "Login successful. Redirecting…";
      setTimeout(() => {
        window.location.href = "/index.html";
      }, 400);
    } catch {
      statusEl.textContent = "Network error. Please try again.";
      submitBtn.disabled = false;
      submitBtn.textContent = "Log in";
    }
  }
);
