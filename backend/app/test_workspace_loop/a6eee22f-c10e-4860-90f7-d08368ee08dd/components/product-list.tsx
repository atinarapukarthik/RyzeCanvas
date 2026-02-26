import type { FC } from "react";
import type { Product } from "@/types/product";
import ProductCard from "./product-card";

/* -------------------------------------------------
   ProductList – Server Component
   -------------------------------------------------
   Renders a responsive, accessible grid of ProductCard
   components. Tailwind v4 utilities are used for spacing,
   colours and dark‑mode support. The component follows the
   design system (primary, accent, neutrals) via the
   Tailwind colour palette defined in the project’s config.
   ------------------------------------------------- */

interface ProductListProps {
  /** Array of products to display */
  products: Product[];
}

/**
 * ProductList – displays a catalogue of products.
 *
 * • Uses semantic <section> and <ul> elements.
 * • Grid is responsive: 1‑4 columns depending on viewport.
 * • Dark‑mode is handled with the `dark` class.
 * • Each product is rendered by the reusable `ProductCard`
 *   component (client‑side if it contains interactive UI).
 */
const ProductList: FC<ProductListProps> = ({ products }) => {
  return (
    <section
      className="bg-neutral-100 dark:bg-neutral-900 py-12"
      aria-labelledby="product-list-heading"
    >
      {/* Heading */}
      <h2
        id="product-list-heading"
        className="text-2xl font-bold text-primary-600 dark:text-primary-400 text-center mb-8"
      >
        Product Catalog
      </h2>

      {/* Product grid */}
      <ul
        role="list"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4"
      >
        {products.map((product) => (
          <li key={product.id} className="flex">
            {/* ProductCard is expected to be a client component
                handling its own internal layout & interactions. */}
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ProductList;

/* -------------------------------------------------
   NOTE:
   - `ProductCard` must be exported from
     `components/product-card.tsx`. It should be a
     client component (`"use client"` at the top) because
     it may contain interactive elements (e.g., add‑to‑cart
     button).
   - The `Product` type lives in `types/product.ts` and
     contains at least: id, name, price, imageUrl.
   - Tailwind colour tokens (`primary-600`, `neutral-100`,
     etc.) are defined in the project's `tailwind.config.js`.
   ------------------------------------------------- */