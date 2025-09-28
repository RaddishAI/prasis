/**
 * !!!
 * Base URL
 * !!!
 */

/**
 * Base-URL for all API calls
 *
 * Ex: '${BASE_API_URL}/products'
 *
 * @constant {string}
 */
export const BASE_API_URL = "https://v2.api.noroff.dev";

/**
 * !!!
 * Auth endpooints
 * !!!
 */

/**
 * URL for user registration
 *
 * @constant {string}
 */
export const REGISTER_API_URL = `${BASE_API_URL}/auth/register`;

/**
 * URL for user log-in
 *
 * @constant {string}
 */

export const LOGIN_API_URL = `${BASE_API_URL}/auth/login`;

/**
 * URL for creating an API KEY
 *
 * @constant {string}
 */

export const CREATE_API_KEY_URL = `${BASE_API_URL}/auth/create-api-key`;

/**
 * !!!
 * Auction house endpoints
 * !!!
 */

/**
 * URL for auction house listings
 *
 * @constant {string}
 */
export const LISTINGS_API_URL = `${BASE_API_URL}/auction/listings`;

/**
 * !!!
 * Local storage keys
 * !!!
 */

/**
 * LocalStorage key for storing access tokens
 *
 * @constant {string}
 */
export const ACCESS_TOKEN_KEY = "accessToken";

/**
 * LocalStorage key for storing the Noroff API key
 *
 * @constant {string}
 */
export const API_KEY_STORAGE = "X-Noroff-API-Key";

/**
 * !!!
 * Cart storage
 * !!!
 */

/**
 * LocalStorage key for tha shopping cart.
 * Stored as JSON array of items.
 * [ { listingId: "abc123", qty: 2 }, ... ]
 * @constant {string}
 */

export const CART_STORAGE_KEY = "prasis:cart";

/**
 * Custom event name when cart changes.
 * @constant {string}
 */

export const CART_EVENT = "prasis:cart-change";
