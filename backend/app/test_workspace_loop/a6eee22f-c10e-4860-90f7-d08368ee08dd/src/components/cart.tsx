'use client';

import { useState } from 'react';
import type { FC, MouseEvent } from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { colors } from '@/designSystem/theme';

type CartItem = {
  id: string;
  name: string;
  price: number; // price per unit in cents
  quantity: number;
};

type CartProps = {
  /** Optional initial items – useful for SSR hydration or demo purposes */
  initialItems?: CartItem[];
  /** Called when the user clicks the “Checkout” button */
  onCheckout?: (items: CartItem[]) => void;
};

/**
 * Shopping Cart UI component.
 *
 * - Server‑side rendered by default (Next.js) but marked as a client component
 *   because it holds interactive state.
 * - Uses the four‑color design system via inline `style` (primary, backgroundDark,
 *   surfaceNeutrals, accent) to stay within the Antigravity palette.
 * - Fully accessible: semantic landmarks, ARIA labels, keyboard‑friendly
 *   controls.
 * - Tailwind v4 `gap-*` utilities for spacing; `cn()` utility for conditional
 *   class handling.
 */
export const Cart: FC<CartProps> = ({ initialItems = [], onCheckout }) => {
  const [items, setItems] = useState<CartItem[]>(initialItems);

  const updateQuantity = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) =>
          it.id === id ? { ...it, quantity: Math.max(it.quantity + delta, 1) } : it,
        )
        .filter((it) => it.quantity > 0),
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleCheckout = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (onCheckout) {
      onCheckout(items);
    } else {
      // Fallback – simple console output for demo environments
      console.log('Checkout triggered with items:', items);
    }
  };

  const totalCents = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const formattedTotal = (totalCents / 100).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <section
      aria-labelledby="cart-heading"
      className={cn(
        'p-6 rounded-lg',
        // background uses the surfaceNeutrals token
        'bg-surfaceNeutrals',
      )}
      style={{ backgroundColor: colors.surfaceNeutrals }}
    >
      <h2 id="cart-heading" className="text-xl font-semibold mb-4" style={{ color: colors.primary }}>
        Shopping Cart
      </h2>

      {items.length === 0 ? (
        <p className="text-sm" style={{ color: colors.accent }}>
          Your cart is empty.
        </p>
      ) : (
        <>
          <ul role="list" className="flex flex-col gap-4">
            {items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  'flex items-center justify-between p-4 rounded-md',
                  // surfaceNeutrals for each row background
                  'bg-surfaceNeutrals',
                )}
                style={{ backgroundColor: colors.surfaceNeutrals }}
              >
                <div className="flex-1">
                  <p className="font-medium" style={{ color: colors.primary }}>
                    {item.name}
                  </p>
                  <p className="text-sm" style={{ color: colors.accent }}>
                    {(item.price / 100).toLocaleString(undefined, {
                      style: 'currency',
                      currency: 'USD',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    aria-label={`Decrease quantity of ${item.name}`}
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 rounded hover:bg-primary/10"
                  >
                    <Minus size={16} color={colors.primary} />
                  </button>

                  <span className="w-8 text-center" style={{ color: colors.primary }}>
                    {item.quantity}
                  </span>

                  <button
                    aria-label={`Increase quantity of ${item.name}`}
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 rounded hover:bg-primary/10"
                  >
                    <Plus size={16} color={colors.primary} />
                  </button>

                  <button
                    aria-label={`Remove ${item.name} from cart`}
                    onClick={() => removeItem(item.id)}
                    className="p-1 rounded hover:bg-red-100"
                  >
                    <Trash2 size={16} color={colors.accent} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-lg font-semibold" style={{ color: colors.primary }}>
              Total: {formattedTotal}
            </p>
            <button
              onClick={handleCheckout}
              className={cn(
                'px-4 py-2 rounded-md font-medium',
                // primary background with accent text on hover
                'bg-primary text-surfaceNeutrals hover:bg-primary/90',
              )}
              style={{
                backgroundColor: colors.primary,
                color: colors.surfaceNeutrals,
              }}
            >
              Checkout
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default Cart;