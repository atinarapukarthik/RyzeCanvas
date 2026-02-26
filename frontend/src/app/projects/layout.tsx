'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Space_Grotesk, Inter } from 'next/font/google';
import { Folder, Workflow, Search, TerminalSquare, ShieldAlert } from 'lucide-react';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const MOCK_PROJECTS = [
    { id: 'proj-demo-123', name: 'UI Generation Demo' },
    { id: 'proj-solo-999', name: 'Solo Leveling Theme' },
    { id: 'core-777-test', name: 'Core Infrastructure' }
];

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
    const params = useParams();
    const currentId = params?.projectId as string;

    return (
        <div className={`flex h-screen w-full bg-[#0a0a0a] text-[#ffffff] ${inter.className} selection:bg-[#00f5ff] selection:text-[#0a0a0a] overflow-hidden`}>
            {/* Sidebar - Persistent across /projects */}
            <aside className="w-64 border-r border-[#1a1a1a] bg-[#0a0a0a] flex flex-col justify-between">
                <div className="p-4 flex flex-col h-full">
                    <div className="mb-6 flex items-center space-x-2">
                        <Workflow className="w-6 h-6 text-[#00f5ff]" />
                        <span className={`text-[#ffffff] font-bold text-lg tracking-wider ${spaceGrotesk.className}`}>ANTIGRAVITY</span>
                    </div>

                    <div className="mb-4 text-xs font-semibold text-gray-500 uppercase tracking-widest pl-2">
                        Workspace Projects
                    </div>

                    <div className="space-y-1 flex-1 overflow-y-auto">
                        {MOCK_PROJECTS.map((project) => (
                            <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-all duration-200 group ${currentId === project.id
                                    ? 'bg-[#1a1a1a] text-[#00f5ff]'
                                    : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-[#ffffff]'
                                    }`}
                                aria-label={`Select Project ${project.name}`}
                            >
                                <Folder className={`w-4 h-4 ${currentId === project.id ? 'text-[#00f5ff]' : 'group-hover:text-[#ffffff]'}`} />
                                <span className="truncate text-sm">{project.name}</span>
                            </Link>
                        ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-[#1a1a1a] flex flex-col space-y-3">
                        <div className="text-xs text-gray-500 flex items-center space-x-2">
                            <TerminalSquare className="w-4 h-4" />
                            <span>Orchestration v4.0</span>
                        </div>
                        <div className="text-xs text-green-500 flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span>v1 API Connected</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
                {children}
            </main>
        </div>
    );
}
