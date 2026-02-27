"use client"

import { FileIcon } from "lucide-react"
import { useMemo } from "react"
import { motion } from "framer-motion"
import { diffLines } from "diff"
import { cn } from "@/lib/utils"

interface CodeComparisonProps {
	beforeCode: string
	afterCode: string
	language?: string
	filename?: string
	lightTheme?: string
	darkTheme?: string
	beforeLabel?: string
	afterLabel?: string
}

export function CodeComparison({
	beforeCode,
	afterCode,
	filename = "code.tsx",
}: CodeComparisonProps) {
	const diffs = useMemo(() => {
		if (beforeCode || afterCode) {
			return diffLines(beforeCode || "", afterCode || "")
		}
		return []
	}, [beforeCode, afterCode])

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className="mx-auto w-full h-full flex flex-col"
		>
			<div className="relative w-full flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] backdrop-blur-lg flex flex-col">
				<div className="flex items-center gap-2 bg-white/5 px-4 py-3 border-b border-white/5 shrink-0">
					<FileIcon className="h-4 w-4 text-blue-400" />
					<span className="flex-1 text-xs font-medium text-white/70 font-mono">
						{filename}
					</span>
					<span className="text-[10px] text-white/40">Unified Diff</span>
				</div>

				<div className="flex-1 overflow-auto p-0 font-mono text-xs">
					<div className="min-w-fit">
						{diffs.map((part, index) => {
							const colorClass = part.added
								? "bg-green-900/30 text-green-100"
								: part.removed
									? "bg-red-900/30 text-red-100 opacity-70"
									: "text-gray-300"

							const prefix = part.added ? "+ " : part.removed ? "- " : "  "

							// Handle multiline diffs
							return part.value.split('\n').map((line, lineIndex) => {
								if (lineIndex === part.value.split('\n').length - 1 && line === "") return null; // Skip trailing newline split
								return (
									<div
										key={`${index}-${lineIndex}`}
										className={cn("flex whitespace-pre px-4 py-0.5 border-l-2",
											part.added ? "border-green-500" :
												part.removed ? "border-red-500" : "border-transparent",
											colorClass
										)}
									>
										<span className="select-none text-white/20 w-6 shrink-0 text-right mr-4">{/* Line numbers could go here */}</span>
										<span className="select-none w-4 shrink-0 opacity-50">{prefix}</span>
										<span>{line}</span>
									</div>
								)
							})
						})}
					</div>
				</div>
			</div>
		</motion.div>
	)
}
