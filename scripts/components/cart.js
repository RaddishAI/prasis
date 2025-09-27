// @ts-check

/**
 * Local storage for shppoing cart
 * Stored as jason of items:
 * [
 *      { listingID: "abc123", qty: 2},
 *      { listingID: "xyz999", qty: 1}
 * ]
 *
 * @constant {string}
 */
export const CART_STORAGE_KEY = "prasis:cart";

/**
 * Event that change cart number
 *
 * Listeing with: window.addEventListener(CART_EVENT, handler)
 *
 * @constant {string}
 */

export const CART_EVENT = "prasis:cart-change";
