import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

type ProductCardProps = {
  id: string;
  name: string;
  description: string;
  price: string;
  imageUrl?: string;
};

export default function ProductCard({
  id,
  name,
  description,
  price,
  imageUrl,
}: ProductCardProps) {
  return (
    <article
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-gray-200',
        'bg-[var(--color-surface)] p-4 shadow-sm',
        'hover:shadow-md transition-shadow'
      )}
    >
      {/* Image */}
      <div className="relative h-48 w-full overflow-hidden rounded-md bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            priority={false}
          />
        ) : (
          <Image
            src={`/placeholder.svg?height=200&width=300&query=${encodeURIComponent(name)}`}
            alt="Placeholder"
            fill
            className="object-contain p-4"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 flex-grow">
        <h2
          className="text-lg font-semibold"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {name}
        </h2>
        <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
        <p className="mt-2 text-base font-medium" style={{ color: 'var(--color-primary)' }}>
          {price}
        </p>
      </div>

      {/* CTA */}
      <Link
        href={`/products/${id}`}
        className={cn(
          'flex items-center gap-1 self-start text-[var(--color-accent)]',
          'hover:underline'
        )}
      >
        View Details
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}