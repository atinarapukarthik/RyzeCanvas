import { Header } from '@/components/header';
import { HeroSection } from '@/components/hero-section';
import { Features } from '@/components/features';
import Footer from '@/components/footer';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Landing Page',
  description: 'Welcome to our product – discover features and get started.',
};

export default function LandingPage() {
  return (
    <main
      className={cn(
        'flex flex-col min-h-screen',
        // Background and primary text color come from CSS variables defined in globals.css
        'bg-[var(--color-bg-dark)] text-[var(--color-primary)]',
      )}
    >
      <Header />
      <HeroSection />
      <Features />
      <Footer />
    </main>
  );
}