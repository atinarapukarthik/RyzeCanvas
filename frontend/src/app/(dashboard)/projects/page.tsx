import { redirect } from 'next/navigation';

export default function ProjectsRootPage() {
    // Redirect to the default mock project for immediate demo access
    redirect('/projects/proj-demo-123');
}
