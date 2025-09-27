// pages/login/test-login.js
import {
  LOGIN_API_URL,
  CREATE_API_KEY_URL, // ← if your constants use CREATE_API_KEY (no _URL), rename below
  LISTINGS_API_URL,
} from "../../scripts/constants.js";
import { DEV_EMAIL, DEV_PASSWORD } from "../../utils/dev-secrets.js";
import { doFetch } from "../../utils/doFetch.js";

async function testLogin() {
  try {
    console.log("→ Trying login with:", { email: DEV_EMAIL });

    const res = await fetch(LOGIN_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD }),
    });

    const data = await res.json().catch(() => ({}));
    console.log("📜 Login response:", res.status, data);

    if (!res.ok) {
      const msg =
        data?.errors?.[0]?.message || data?.message || `HTTP ${res.status}`;
      console.error("❌ Login failed:", msg);
      return;
    }

    const token = data?.data?.accessToken;
    if (!token) {
      console.error("❌ No accessToken in response");
      return;
    }

    localStorage.setItem("accessToken", token);
    console.log("✅ Stored access token:", token.slice(0, 12) + "…");

    await createApiKeyAndTest(); // proceed to API key + test fetch
  } catch (err) {
    console.error("🔥 Error while logging in:", err);
  }
}

async function createApiKeyAndTest() {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    console.error("No token in localStorage. Run login first.");
    return;
  }

  // 1) Create API key (needs only the Bearer token)
  const res = await fetch(CREATE_API_KEY_URL, {
    // ← rename to CREATE_API_KEY if that's your export
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name: "prasis-local-dev" }),
  });

  const data = await res.json().catch(() => ({}));
  console.log("🧷 Create API key:", res.status, data);

  if (!res.ok) {
    const maybeKey = data?.data?.key;
    if (maybeKey) {
      localStorage.setItem("X-Noroff-API-Key", maybeKey);
      console.log("ℹ️ Reused existing API key:", maybeKey.slice(0, 12) + "…");
    } else {
      console.error(
        "❌ Could not create API key:",
        data?.errors?.[0]?.message || data?.message
      );
      return;
    }
  } else {
    const apiKey = data?.data?.key;
    localStorage.setItem("X-Noroff-API-Key", apiKey);
    console.log("✅ Stored API key:", apiKey.slice(0, 12) + "…");
  }

  // 2) Prove auth headers work with your doFetch wrapper
  const {
    ok,
    status,
    data: listings,
  } = await doFetch(
    `${LISTINGS_API_URL}?_limit=2&_seller=true&_bids=true`,
    { method: "GET" },
    true // attaches Authorization + X-Noroff-API-Key
  );

  console.log("📦 Listings (auth):", status, ok, listings);
}

testLogin();
