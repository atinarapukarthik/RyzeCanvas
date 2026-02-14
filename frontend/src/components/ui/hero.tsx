"use client";

import * as React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Scene } from "./neon-raymarcher";

interface HeroProps {
	title?: string;
	subtitle?: string;
	primaryCTA?: {
		text: string;
		onClick: () => void;
	};
	secondaryCTA?: {
		text: string;
		onClick: () => void;
	};
	className?: string;
}

export function Hero({
	title = "Build Stunning Apps with AI",
	subtitle = "Transform your ideas into production-ready code with RyzeCanvas. The AI-powered platform that understands your vision.",
	primaryCTA = { text: "Get Started", onClick: () => { } },
	secondaryCTA = { text: "View Demo", onClick: () => { } },
	className,
}: HeroProps) {
	const { scrollYProgress } = useScroll();
	const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
	const scale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

	return (
		<motion.div
			style={{ opacity, scale }}
			className={cn(
				"relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background",
				className
			)}
		>
			{/* Neon Raymarcher Background */}
			<div className="absolute inset-0 overflow-hidden">
				<Scene />
			</div>

			{/* Content */}
			<div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8">
				<div className="flex flex-col items-center text-center">
					{/* Badge */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.2 }}
						className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
					>
						<Sparkles className="w-4 h-4 text-primary" />
						<span className="text-sm font-medium text-foreground">
							Powered by AI
						</span>
					</motion.div>

					{/* Title */}
					<motion.h1
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.4 }}
						className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 max-w-5xl"
					>
						<span className="bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
							{title}
						</span>
					</motion.h1>

					{/* Subtitle */}
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.6 }}
						className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10"
					>
						{subtitle}
					</motion.p>

					{/* CTAs */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 0.8 }}
						className="flex flex-col sm:flex-row gap-4 items-center"
					>
						<button
							onClick={primaryCTA.onClick}
							className="group px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl hover:brightness-105 transition-all flex items-center gap-2"
						>
							<Zap className="w-5 h-5" />
							{primaryCTA.text}
							<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
						</button>

						<button
							onClick={secondaryCTA.onClick}
							className="px-8 py-4 bg-muted hover:bg-muted/80 text-foreground rounded-2xl font-semibold text-lg transition-all"
						>
							{secondaryCTA.text}
						</button>
					</motion.div>

					{/* Stats or Features */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, delay: 1 }}
						className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl"
					>
						{[
							{
								icon: <Sparkles className="w-6 h-6" />,
								title: "AI-Powered",
								description: "Generate code with advanced AI models",
							},
							{
								icon: <Zap className="w-6 h-6" />,
								title: "Lightning Fast",
								description: "From idea to production in minutes",
							},
							{
								icon: <ArrowRight className="w-6 h-6" />,
								title: "Production Ready",
								description: "Clean, maintainable, and scalable code",
							},
						].map((feature, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{ duration: 0.5, delay: index * 0.1 }}
								className="flex flex-col items-center text-center p-6 rounded-2xl bg-background/50 backdrop-blur-sm border border-border/50 hover:border-primary/30 transition-colors"
							>
								<div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
									{feature.icon}
								</div>
								<h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
								<p className="text-sm text-muted-foreground">
									{feature.description}
								</p>
							</motion.div>
						))}
					</motion.div>
				</div>
			</div>

			{/* Bottom gradient fade */}
			<div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />
		</motion.div>
	);
}
