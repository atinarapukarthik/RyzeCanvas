'use client';

import React from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className={`flex h-screen w-full bg-[#0a0a0a] text-[#ffffff] ${inter.className} selection:bg-[#00f5ff] selection:text-[#0a0a0a] overflow-hidden`}>
            {/* Main Content Area */}
            <main className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
                {children}
            </main>
        </div>
    );
}
