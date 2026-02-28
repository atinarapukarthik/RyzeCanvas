import { redirect } from 'next/navigation';

export default function ProjectsRootPage() {
    // Redirect to the dashboard where real projects are listed
    redirect('/dashboard');
}
