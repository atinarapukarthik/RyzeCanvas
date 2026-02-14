"use client"

import { FileIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { codeToHtml } from "shiki"
import { motion } from "framer-motion"

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
	language = "typescript",
	filename = "code.tsx",
	lightTheme = "github-light",
	darkTheme = "github-dark",
	beforeLabel = "before",
	afterLabel = "after",
}: CodeComparisonProps) {
	const { theme, systemTheme } = useTheme()
	const [highlightedBefore, setHighlightedBefore] = useState("")
	const [highlightedAfter, setHighlightedAfter] = useState("")
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const currentTheme = theme === "system" ? systemTheme : theme
		const selectedTheme = currentTheme === "dark" ? darkTheme : lightTheme

		async function highlightCode() {
			setIsLoading(true)
			try {
				const before = await codeToHtml(beforeCode, {
					lang: language,
					theme: selectedTheme,
				})
				const after = await codeToHtml(afterCode, {
					lang: language,
					theme: selectedTheme,
				})
				setHighlightedBefore(before)
				setHighlightedAfter(after)
			} catch (error) {
				console.error("Error highlighting code:", error)
			} finally {
				setIsLoading(false)
			}
		}

		highlightCode()
	}, [
		theme,
		systemTheme,
		beforeCode,
		afterCode,
		language,
		lightTheme,
		darkTheme,
	])

	const renderCode = (code: string, highlighted: string) => {
		if (highlighted) {
			return (
				<div
					className="h-full overflow-auto bg-[hsl(var(--background))] font-mono text-xs [&>pre]:h-full [&>pre]:!bg-transparent [&>pre]:p-4 [&_code]:break-all text-[hsl(var(--neon-text))]"
					dangerouslySetInnerHTML={{ __html: highlighted }}
				/>
			)
		} else {
			return (
				<pre className="h-full overflow-auto break-all bg-[hsl(var(--background))] p-4 font-mono text-xs text-[hsl(var(--neon-text))]">
					{code}
				</pre>
			)
		}
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className="mx-auto w-full"
		>
			<div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-lg">
				{isLoading && (
					<div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
						<div className="flex flex-col items-center gap-3">
							<motion.div
								animate={{ rotate: 360 }}
								transition={{
									duration: 2,
									repeat: Infinity,
									ease: "linear",
								}}
								className="h-6 w-6 rounded-full border-2 border-white/20 border-t-[hsl(var(--neon-text))]"
							/>
							<span className="text-xs text-white/50">
								Highlighting code...
							</span>
						</div>
					</div>
				)}

				<div className="relative grid md:grid-cols-2 md:divide-x md:divide-white/5">
					{/* Before Panel */}
					<div>
						<div className="flex items-center gap-2 bg-white/5 px-4 py-3 border-b border-white/5">
							<FileIcon className="h-4 w-4 text-[hsl(var(--primary))]" />
							<span className="flex-1 text-xs font-medium text-white/70">
								{filename}
							</span>
							<span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/50 border border-white/10">
								{beforeLabel}
							</span>
						</div>
						{renderCode(beforeCode, highlightedBefore)}
					</div>

					{/* After Panel */}
					<div>
						<div className="flex items-center gap-2 bg-white/5 px-4 py-3 border-b border-white/5">
							<FileIcon className="h-4 w-4 text-[hsl(var(--accent))]" />
							<span className="flex-1 text-xs font-medium text-white/70">
								{filename}
							</span>
							<span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/50 border border-white/10">
								{afterLabel}
							</span>
						</div>
						{renderCode(afterCode, highlightedAfter)}
					</div>
				</div>

				{/* VS Badge */}
				<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] text-xs font-bold text-white shadow-2xl shadow-[hsl(var(--primary))]/50 border border-white/20">
					VS
				</div>
			</div>
		</motion.div>
	)
}
