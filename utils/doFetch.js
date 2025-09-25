/**
 * Custom fetch function that allows for optional auth requests
 * @param {string} url
 * @param {*} initialOptions
 * @param {boolean} shouldUseAuth
 * @returns
 */

export async function doFetch(url, initialOptions = {}, useAuth = false) {
  try {
    const headers = {
      "Content-Type": "application/json",
      ...(initialOptions.headers || {}),
    };

    if (useAuth) {
      const accessToken = localStorage.getItem("accessToken");
      const apiKey = localStorage.getItem("X-Noroff-API-Key");

      if (!accessToken) {
        console.error("No access token found! Log in first.");
        return { ok: false, data: { error: "Unauthorized. No access token." } };
      }
      if (!apiKey) {
        console.error("No API key found! Create one after login.");
        return { ok: false, data: { error: "Unauthorized. No API key." } };
      }

      headers.Authorization = `Bearer ${accessToken}`;
      headers["X-Noroff-API-Key"] = apiKey;
    }

    const res = await fetch(url, { ...initialOptions, headers });
    const data = await res.json().catch(() => ({}));

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error("doFetch error:", err);
    return { ok: false, data: { error: "Network or parsing error" } };
  }
}
