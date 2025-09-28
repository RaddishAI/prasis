/**
 * !!!
 * Fetch helper
 * !!!
 */

/**
 * Custom fetch that supports three auth modes:
 *  - "none": no auth headers
 *  - "token": Bearer only (e.g., /auth/create-api-key)
 *  - "full": Bearer + X-Noroff-API-Key (e.g., auction endpoints)
 *
 * Backwards compatibility:
 *  - If the 3rd argument is a boolean:
 *      true  => "full"
 *      false => "none"
 *
 * @param {string} url
 * @param {*} initialOptions
 * @param {"none"|"token"|"full"|boolean} auth
 * @returns {Promise<{ok: boolean, status?: number, data: any}>}
 */
export async function doFetch(url, initialOptions = {}, auth = "none") {
  try {
    // normalize legacy boolean to mode
    const mode = typeof auth === "boolean" ? (auth ? "full" : "none") : auth;

    const headers = {
      "Content-Type": "application/json",
      ...(initialOptions.headers || {}),
    };

    if (mode !== "none") {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        console.error("No access token found! Log in first.");
        return { ok: false, data: { error: "Unauthorized. No access token." } };
      }
      headers.Authorization = `Bearer ${accessToken}`;

      if (mode === "full") {
        const apiKey = localStorage.getItem("X-Noroff-API-Key");
        if (!apiKey) {
          console.error("No API key found! Create one after login.");
          return { ok: false, data: { error: "Unauthorized. No API key." } };
        }
        headers["X-Noroff-API-Key"] = apiKey;
      }
    }

    const res = await fetch(url, { ...initialOptions, headers });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error("doFetch error:", err);
    return { ok: false, data: { error: "Network or parsing error" } };
  }
}
