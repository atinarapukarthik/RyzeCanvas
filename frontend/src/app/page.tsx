"use client";

import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { SocialProof } from '@/components/landing/SocialProof';
import { Features } from '@/components/landing/Features';
import { CTASection } from '@/components/landing/CTASection';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Zap, Github, Twitter, Linkedin } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen mesh-gradient selection:bg-primary/30">
      <Navbar />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <CTASection />
      </main>

      {/* Enhanced Footer */}
      <footer className="relative py-20 border-t border-border/30 bg-surface/50 backdrop-blur-sm overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              repeat: Infinity,
              duration: 8,
              ease: 'easeInOut',
            }}
          />
        </div>

        <div className="container relative z-10">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand column */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4 group w-fit">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                  <Zap className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-2xl font-black tracking-tight">RyzeCanvas</span>
              </Link>
              <p className="text-muted-foreground max-w-sm leading-relaxed mb-6">
                Build production-ready React & Next.js applications at the speed of thought.
                Powered by deterministic AI.
              </p>
              <div className="flex gap-3">
                {[
                  { icon: Github, href: '#', label: 'GitHub' },
                  { icon: Twitter, href: '#', label: 'Twitter' },
                  { icon: Linkedin, href: '#', label: 'LinkedIn' },
                ].map(({ icon: Icon, href, label }) => (
                  <motion.a
                    key={label}
                    href={href}
                    className="flex h-10 w-10 items-center justify-center rounded-lg glass border border-border/40 hover:border-primary/40 text-muted-foreground hover:text-primary transition-colors"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Links columns */}
            <div>
              <h3 className="font-bold text-foreground mb-4">Product</h3>
              <ul className="space-y-3">
                {['Features', 'Pricing', 'Changelog', 'Roadmap'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors inline-block hover:translate-x-1 transition-transform"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-foreground mb-4">Resources</h3>
              <ul className="space-y-3">
                {['Documentation', 'API Reference', 'Examples', 'Community'].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors inline-block hover:translate-x-1 transition-transform"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-border/30 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground/60">
              © 2026 RyzeCanvas. Engineered for the next generation of developers.
            </p>
            <div className="flex gap-6 text-sm font-medium">
              <a href="#" className="text-muted-foreground/60 hover:text-primary transition-colors">
                Privacy
              </a>
              <a href="#" className="text-muted-foreground/60 hover:text-primary transition-colors">
                Terms
              </a>
              <a href="#" className="text-muted-foreground/60 hover:text-primary transition-colors">
                Security
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
