import Header from '@/components/header';
import Footer from '@/components/footer';
import ProjectCard from '@/components/project-card';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

type Project = {
  title: string;
  description: string;
  imageUrl: string;
  link: string;
};

const featuredProjects: Project[] = [
  {
    title: 'Project Alpha',
    description:
      'A cutting‑edge web application that leverages AI to personalize user experiences.',
    imageUrl: '/placeholder.svg?height=300&width=400&query=Alpha',
    link: '#',
  },
  {
    title: 'Project Beta',
    description:
      'An open‑source library for handling complex data visualizations with ease.',
    imageUrl: '/placeholder.svg?height=300&width=400&query=Beta',
    link: '#',
  },
  {
    title: 'Project Gamma',
    description:
      'A mobile‑first platform that streamlines workflow automation for small teams.',
    imageUrl: '/placeholder.svg?height=300&width=400&query=Gamma',
    link: '#',
  },
  {
    title: 'Project Delta',
    description:
      'A responsive e‑commerce storefront built with modern best practices.',
    imageUrl: '/placeholder.svg?height=300&width=400&query=Delta',
    link: '#',
  },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main className={cn('flex flex-col items-center')}>
        {/* Hero Section */}
        <section
          className={cn(
            'w-full bg-[var(--color-bg-dark)] text-white py-20',
            'flex flex-col items-center justify-center gap-6'
          )}
        >
          <h1
            className="text-5xl font-bold text-center"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Welcome to My Portfolio
          </h1>
          <p
            className="text-xl max-w-2xl text-center"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Crafting elegant solutions with modern web technologies.
          </p>
          <Link
            href="#projects"
            className={cn(
              'inline-flex items-center bg-[var(--color-accent)] text-white',
              'px-6 py-3 rounded-md hover:bg-[var(--color-primary)] transition-colors'
            )}
          >
            Explore My Work
            <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
          </Link>
        </section>

        {/* Featured Projects */}
        <section
          id="projects"
          className={cn(
            'container mx-auto px-4 py-16',
            'grid gap-8 sm:grid-cols-2 lg:grid-cols-3'
          )}
        >
          <h2
            className="col-span-full text-3xl font-semibold text-center mb-8"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Featured Projects
          </h2>
          {featuredProjects.map((project) => (
            <ProjectCard
              key={project.title}
              title={project.title}
              description={project.description}
              imageUrl={project.imageUrl}
              link={project.link}
            />
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}