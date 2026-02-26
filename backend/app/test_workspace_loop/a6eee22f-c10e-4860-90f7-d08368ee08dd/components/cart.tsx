"use client";

import { useState, useCallback, useMemo } from "react";
import type { FC } from "react";
import { Plus, Minus } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * Cart item type – keep it lightweight and import‑only for type safety.
 */
type CartItem = {
  id: number;
  name: string;
  price: number; // price per unit, in USD
  quantity: number;
};

/**
 * Sample data – replace with real data source (e.g., context, API) later.
 */
const INITIAL_ITEMS: CartItem[] = [
  { id: 1, name: "Product A", price: 29.99, quantity: 2 },
  { id: 2, name: "Product B", price: 15.5, quantity: 1 },
];

/**
 * Cart – a client component because it holds interactive state.
 *
 * Accessibility:
 *   • <section> with aria‑labelledby for screen readers.
 *   • Semantic <ul>/<li> with proper roles.
 *   • Buttons have clear aria‑labels.
 *
 * Styling:
 *   • Tailwind v4 utilities only.
 *   • Dark mode support via the manual `dark` class.
 *   • `cn` utility used for conditional class composition.
 */
const Cart: FC = () => {
  const [items, setItems] = useState<CartItem[]>(INITIAL_ITEMS);

  /** Update quantity for a given item id. */
  const updateQuantity = useCallback(
    (id: number, delta: number) => {
      setItems((prev) =>
        prev
          .map((item) =>
            item.id === id
              ? { ...item, quantity: Math.max(item.quantity + delta, 0) }
              : item
          )
          .filter((item) => item.quantity > 0) // remove items with 0 qty
      );
    },
    []
  );

  /** Compute total price – memoised for performance. */
  const total = useMemo(() => {
    return items
      .reduce((sum, item) => sum + item.price * item.quantity, 0)
      .toFixed(2);
  }, [items]);

  return (
    <section
      aria-labelledby="cart-heading"
      className={cn(
        "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        "p-6 rounded-lg max-w-md mx-auto",
        "shadow-md"
      )}
    >
      <h2 id="cart-heading" className="text-2xl font-semibold mb-4">
        Shopping Cart
      </h2>

      {items.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400">
          Your cart is empty.
        </p>
      ) : (
        <ul role="list" className="space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              role="listitem"
              className="flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="font-medium">{item.name}</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  ${item.price.toFixed(2)} each
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Decrease quantity */}
                <button
                  type="button"
                  aria-label={`Decrease quantity of ${item.name}`}
                  onClick={() => updateQuantity(item.id, -1)}
                  className={cn(
                    "p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  )}
                >
                  <Minus size={16} aria-hidden="true" />
                </button>

                {/* Quantity display */}
                <span aria-live="polite" className="w-6 text-center">
                  {item.quantity}
                </span>

                {/* Increase quantity */}
                <button
                  type="button"
                  aria-label={`Increase quantity of ${item.name}`}
                  onClick={() => updateQuantity(item.id, 1)}
                  className={cn(
                    "p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700",
                    "focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  )}
                >
                  <Plus size={16} aria-hidden="true" />
                </button>
              </div>

              {/* Sub‑total for this line item */}
              <span className="font-medium">
                ${ (item.price * item.quantity).toFixed(2) }
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Cart total */}
      <div className="mt-6 text-right">
        <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
          Total: ${total}
        </p>
      </div>
    </section>
  );
};

export default Cart;