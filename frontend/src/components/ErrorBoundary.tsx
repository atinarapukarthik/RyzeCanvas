"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
                    <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
                    <p className="text-muted-foreground mb-4 max-w-md">
                        {this.state.error?.message || "An unexpected error occurred."}
                    </p>
                    <Button onClick={() => this.setState({ hasError: false })} variant="outline">
                        Try again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
