import { cn } from '@/lib/utils'
import { ProductCard } from '@/components/ui/product-card'

type Product = {
  id: number
  name: string
  price: string
  imageUrl: string
}

// Sample static product data – replace with real data source as needed
const products: Product[] = [
  {
    id: 1,
    name: 'Classic White T‑Shirt',
    price: '$19.99',
    imageUrl: '/placeholder.svg?height=300&width=300&query=White+T-Shirt',
  },
  {
    id: 2,
    name: 'Denim Jeans',
    price: '$49.99',
    imageUrl: '/placeholder.svg?height=300&width=300&query=Denim+Jeans',
  },
  {
    id: 3,
    name: 'Leather Backpack',
    price: '$89.99',
    imageUrl: '/placeholder.svg?height=300&width=300&query=Leather+Backpack',
  },
  {
    id: 4,
    name: 'Running Sneakers',
    price: '$69.99',
    imageUrl: '/placeholder.svg?height=300&width=300&query=Running+Sneakers',
  },
  {
    id: 5,
    name: 'Smartwatch',
    price: '$199.99',
    imageUrl: '/placeholder.svg?height=300&width=300&query=Smartwatch',
  },
  {
    id: 6,
    name: 'Wireless Headphones',
    price: '$149.99',
    imageUrl: '/placeholder.svg?height=300&width=300&query=Headphones',
  },
]

export default function HomePage() {
  return (
    <main
      className={cn(
        'min-h-screen bg-[var(--color-bg-dark)] text-[var(--color-surface)]',
        'py-12 px-4 sm:px-6 lg:px-8'
      )}
    >
      <section className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1
            className={cn(
              'text-4xl font-bold',
              'text-[var(--color-primary)]',
              'font-[var(--font-heading)]'
            )}
          >
            Shop Our Latest Collection
          </h1>
          <p
            className={cn(
              'mt-2 text-lg',
              'text-[var(--color-surface)]',
              'font-[var(--font-body)]'
            )}
          >
            Discover high‑quality products curated just for you.
          </p>
        </header>

        <div
          role="list"
          className={cn(
            'grid gap-6',
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          )}
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              imageUrl={product.imageUrl}
            />
          ))}
        </div>
      </section>
    </main>
  )
}