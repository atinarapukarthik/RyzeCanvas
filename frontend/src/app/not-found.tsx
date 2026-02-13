import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center glass-card p-8">
                <h1 className="text-4xl font-bold mb-4 text-primary">404</h1>
                <p className="text-xl text-muted-foreground mb-4">Oops! Page not found</p>
                <Button asChild>
                    <Link href="/">Return to Home</Link>
                </Button>
            </div>
        </div>
    );
}
