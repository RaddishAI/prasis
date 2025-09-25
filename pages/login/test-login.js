import { LOGIN_API_URL } from "../../scripts/constants.js";
import { DEV_EMAIL, DEV_PASSWORD } from "../../utils/dev-secrets.js";

async function testLogin() {
  try {
    console.log("→ Trying login with:", {
      email: DEV_EMAIL,
      pwLen: DEV_PASSWORD.length,
    });

    const res = await fetch(LOGIN_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: DEV_EMAIL,
        password: DEV_PASSWORD,
      }),
    });

    const data = await res.json().catch(() => ({}));
    console.log("📜 Full API response:", data);

    if (!res.ok) {
      const msg =
        data?.errors?.[0]?.message || data?.message || `HTTP ${res.status}`;
      console.error("❌ Login failed:", msg);
      return;
    }

    const accessToken = data.data.accessToken;
    console.log("✅ Access token received:", accessToken);
  } catch (err) {
    console.error("🔥 Error while logging in:", err);
  }
}

testLogin();
