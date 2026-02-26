import type { FC } from "react";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Product data shape expected by the component.
 */
export interface Product {
  id: string | number;
  name: string;
  description?: string;
  price: number | string;
  /** URL to the product image. If omitted a placeholder will be shown. */
  image?: string;
}

/**
 * ProductCard – a server component that renders a product preview with an
 * “Add to cart” button. It follows the design system:
 *   • Inter font for headings
 *   • Roboto font for body text
 *   • Approved primary colour palette (no gray utilities)
 *   • Dark‑mode support via explicit `dark:` classes
 *   • Semantic HTML and accessible ARIA attributes
 */
export const ProductCard: FC<{ product: Product }> = ({ product }) => {
  const {
    name,
    description,
    price,
    image,
  } = product;

  // Fallback placeholder – the query param is used by the design system
  const imgSrc = image ?? `/placeholder.svg?height=200&width=300&query=${encodeURIComponent(
    name,
  )}`;

  return (
    <article
      className={cn(
        "flex flex-col rounded-lg border border-primary/10 bg-white dark:bg-primary/5",
        "p-4 gap-4",
        "transition-shadow hover:shadow-lg",
      )}
      aria-labelledby={`product-${product.id}-title`}
    >
      {/* Image */}
      <figure className="relative w-full overflow-hidden rounded-md">
        {/* Next.js Image automatically optimises the asset */}
        <Image
          src={imgSrc}
          alt={name}
          width={300}
          height={200}
          className="object-cover w-full h-full"
        />
      </figure>

      {/* Header – product name */}
      <header>
        <h2
          id={`product-${product.id}-title`}
          className={cn(
            "text-lg font-semibold text-primary",
            "font-inter", // Inter for headings
          )}
        >
          {name}
        </h2>
      </header>

      {/* Description – optional */}
      {description && (
        <p
          className={cn(
            "text-sm font-roboto text-primary/60 dark:text-primary/60",
          )}
        >
          {description}
        </p>
      )}

      {/* Footer – price and CTA */}
      <footer className="mt-auto flex items-center justify-between">
        <span
          className={cn(
            "text-xl font-bold text-primary",
            "font-roboto",
          )}
        >
          ${price}
        </span>

        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium",
            "text-white hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          )}
          aria-label={`Add ${name} to cart`}
        >
          <ShoppingCart className="h-4 w-4" aria-hidden="true" />
          Add to cart
        </button>
      </footer>
    </article>
  );
};

export default ProductCard;