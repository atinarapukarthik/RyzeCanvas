import type { Metadata } from 'next';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import ProductCard from '@/components/ProductCard';
import CartDrawer from '@/components/CartDrawer';
import { PRODUCTS } from '@/data/products';

// Optional: define page metadata for SEO
export const metadata: Metadata = {
  title: 'Solo Leveling Store',
  description: 'Featured products for Solo Leveling fans',
};

export default async function HomePage() {
  // In a real implementation you could fetch products here:
  // const products = await fetchProducts();

  // NOTE: No <html> or <body> tags – those belong in a layout file.
  return (
    <>
      {/* Apply the dark‑mode background to a top‑level container */}
      <div className="bg-[#111827] text-gray-100 antialiased min-h-screen">
        {/* Header includes navigation and cart button */}
        <Header />

        {/* Hero section */}
        <Hero />

        {/* Product listing */}
        <section
          id="products"
          className="py-12"
          aria-labelledby="products-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2
              id="products-heading"
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Featured Products
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-gray-300">
              Hand‑picked items that every Solo Leveling fan will love.
            </p>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {PRODUCTS.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* Cart drawer – rendered once for the whole app */}
        <CartDrawer />
      </div>
    </>
  );
}