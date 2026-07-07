export const cartStorageKey = "commerce-core-cart";

export type CartItems = Record<string, number>;

export function readCart(storage: Storage) {
  try {
    const parsed = JSON.parse(storage.getItem(cartStorageKey) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const cart: CartItems = {};

    for (const [productId, quantity] of Object.entries(parsed)) {
      const parsedQuantity = Number(quantity);
      if (Number.isInteger(parsedQuantity) && parsedQuantity > 0) {
        cart[productId] = parsedQuantity;
      }
    }

    return cart;
  } catch {
    return {};
  }
}

export function writeCart(storage: Storage, cart: CartItems) {
  const normalized = Object.fromEntries(Object.entries(cart).filter(([, quantity]) => Number.isInteger(quantity) && quantity > 0));
  storage.setItem(cartStorageKey, JSON.stringify(normalized));
}

export function clearCart(storage: Storage) {
  storage.removeItem(cartStorageKey);
}
