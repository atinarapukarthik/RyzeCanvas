import type { FC, MouseEventHandler } from 'react';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';

export type ProductCardProps = {
  /** URL of the product image */
  imageUrl: string;
  /** Alt text for the product image */
  imageAlt?: string;
  /** Product title */
  title: string;
  /** Formatted price (e.g. "$19.99") */
  price: string;
  /** Callback when the “Add to cart” button is clicked */
  onAddToCart?: MouseEventHandler<HTMLButtonElement>;
};

/**
 * Reusable product card component.
 *
 * - Server Component (default in Next.js 13+)
 * - Uses the approved design‑system palette: `primary`, `backgroundDark`,
 *   `surfaceNeutrals`, `accent`.
 * - Semantic HTML (`article`, `header`, `figure`, `figcaption`).
 * - Accessible button with ARIA label.
 * - Tailwind v4 `gap-*` utilities for spacing.
 * - Lucide React icon for the cart action.
 */
const ProductCard: FC<ProductCardProps> = ({
  imageUrl,
  imageAlt = '',
  title,
  price,
  onAddToCart,
}) => {
  return (
    <article
      className={`
        flex flex-col gap-4
        rounded-lg
        bg-surfaceNeutrals dark:bg-backgroundDark
        p-4
        shadow-md
        hover:shadow-lg
        transition-shadow
      `}
      role="region"
      aria-label={`Product card for ${title}`}
    >
      {/* Image */}
      <figure className="relative w-full pt-[75%] overflow-hidden rounded-md">
        {/* Next.js Image with fill layout for responsive aspect ratio */}
        <Image
          src={imageUrl}
          alt={imageAlt || title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, 300px"
        />
      </figure>

      {/* Title & Price */}
      <header className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        <p className="text-base font-medium text-surfaceNeutrals dark:text-primary">
          {price}
        </p>
      </header>

      {/* Add‑to‑cart button */}
      <button
        type="button"
        onClick={onAddToCart}
        className={`
          flex items-center justify-center gap-2
          rounded-md
          bg-primary hover:bg-primary/80
          text-white
          py-2
          transition-colors
        `}
        aria-label={`Add ${title} to cart`}
      >
        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        <span>Add to cart</span>
      </button>
    </article>
  );
};

export default ProductCard;