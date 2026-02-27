'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

type CartWidgetProps = {
  /** Optional initial count – useful for SSR hydration */
  initialCount?: number;
};

export default function CartWidget({ initialCount = 0 }: CartWidgetProps) {
  const [itemCount, setItemCount] = useState<number>(initialCount);

  // Placeholder effect – in a real app this would subscribe to a cart store / context
  useEffect(() => {
    // Example: simulate adding an item after 3 seconds
    const timer = setTimeout(() => setItemCount((c) => c + 1), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      type="button"
      aria-label={`Cart with ${itemCount} item${itemCount === 1 ? '' : 's'}`}
      className={cn(
        'fixed bottom-4 right-4',
        'flex items-center justify-center',
        'bg-[var(--color-primary)] text-white',
        'rounded-full shadow-lg',
        'w-14 h-14',
        'hover:bg-[var(--color-primary)]/90',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)]'
      )}
    >
      <ShoppingCart className="h-6 w-6" aria-hidden="true" />
      {itemCount > 0 && (
        <span
          className={cn(
            'absolute -top-1 -right-1',
            'flex items-center justify-center',
            'bg-[var(--color-accent)] text-xs text-white',
            'rounded-full w-5 h-5'
          )}
        >
          {itemCount}
        </span>
      )}
    </button>
  );
}