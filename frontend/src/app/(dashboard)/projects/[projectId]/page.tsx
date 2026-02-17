"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { StudioContent } from "../../studio/page";

export default function ProjectPage() {
    const params = useParams<{ projectId: string }>();
    const projectId = params.projectId;

    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center h-full">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
            }
        >
            <StudioContent initialProjectId={projectId} />
        </Suspense>
    );
}
