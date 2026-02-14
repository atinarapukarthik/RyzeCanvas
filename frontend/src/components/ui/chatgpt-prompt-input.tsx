"use client";

import * as React from "react";
import Image from "next/image";
import { useState, useRef } from "react";
import {
	Send,
	Paperclip,
	Mic,
	Settings,
	X,
	Search,
	Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";

interface ChatGPTPromptInputProps {
	onSubmit?: (prompt: string, options: PromptOptions) => void | Promise<void>;
	placeholder?: string;
	className?: string;
}

interface PromptOptions {
	images?: File[];
	webSearch?: boolean;
	framework?: "next" | "react" | null;
	planMode?: boolean;
}

function ImagePreviewItem({
	image,
	onRemove,
	onClick,
}: {
	image: File;
	onRemove: () => void;
	onClick: () => void;
}) {
	const [url, setUrl] = React.useState<string>("");

	React.useEffect(() => {
		const newUrl = URL.createObjectURL(image);
		setUrl(newUrl);
		return () => URL.revokeObjectURL(newUrl);
	}, [image]);

	if (!url) return <div className="w-20 h-20 rounded-lg bg-muted animate-pulse" />;

	return (
		<div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted group">
			<Image
				src={url}
				alt="Upload preview"
				width={80}
				height={80}
				className="w-full h-full object-cover cursor-pointer"
				onClick={onClick}
				unoptimized
			/>
			<button
				onClick={onRemove}
				className="absolute top-1 right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
			>
				<X className="w-3 h-3" />
			</button>
		</div>
	);
}

function LargeImagePreview({ image }: { image: File }) {
	const [url, setUrl] = React.useState<string>("");

	React.useEffect(() => {
		const newUrl = URL.createObjectURL(image);
		setUrl(newUrl);
		return () => URL.revokeObjectURL(newUrl);
	}, [image]);

	if (!url) return null;

	return (
		<Image
			src={url}
			alt="Preview"
			width={500}
			height={500}
			className="w-full h-full object-contain rounded-lg"
			unoptimized
		/>
	);
}

export function ChatGPTPromptInput({
	onSubmit,
	placeholder = "Message RyzeCanvas...",
	className,
}: ChatGPTPromptInputProps) {
	const [prompt, setPrompt] = useState("");
	const [images, setImages] = useState<File[]>([]);
	const [isRecording, setIsRecording] = useState(false);
	const [selectedImage, setSelectedImage] = useState<File | null>(null);
	const [webSearch, setWebSearch] = useState(false);
	const [framework, setFramework] = useState<"next" | "react" | null>(null);
	const [planMode, setPlanMode] = useState(false);
	const [isToolsOpen, setIsToolsOpen] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleSubmit = async () => {
		if (!prompt.trim() && images.length === 0) return;

		const options: PromptOptions = {
			images,
			webSearch,
			framework,
			planMode,
		};

		if (onSubmit) {
			await onSubmit(prompt, options);
		}

		// Reset after submit
		setPrompt("");
		setImages([]);
		setWebSearch(false);
		setFramework(null);
		setPlanMode(false);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		setImages((prev) => [...prev, ...files]);
	};

	const removeImage = (index: number) => {
		setImages((prev) => prev.filter((_, i) => i !== index));
	};

	const toggleRecording = () => {
		setIsRecording(!isRecording);
	};

	const hasContent = prompt.trim().length > 0 || images.length > 0;

	return (
		<Tooltip.Provider>
			<div className={cn("w-full max-w-4xl mx-auto", className)}>
				<div className="relative w-full">
					{/* Upload Images Display */}
					{images.length > 0 && (
						<div className="flex gap-2 mb-2 flex-wrap">
							{images.map((image, index) => (
								<ImagePreviewItem
									key={index}
									image={image}
									onRemove={() => removeImage(index)}
									onClick={() => setSelectedImage(image)}
								/>
							))}
						</div>
					)}

					{/* Main Input Container */}
					<div className="relative w-full bg-background border border-border rounded-3xl shadow-lg focus-within:ring-2 focus-within:ring-primary/20 transition-all">
						<div className="flex items-end gap-2 p-3">
							{/* Upload Button */}
							<Tooltip.Root>
								<Tooltip.Trigger asChild>
									<button
										onClick={() => fileInputRef.current?.click()}
										className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
									>
										<Paperclip className="w-5 h-5" />
									</button>
								</Tooltip.Trigger>
								<Tooltip.Portal>
									<Tooltip.Content
										className="bg-popover text-popover-foreground px-3 py-1.5 rounded-lg text-sm shadow-md"
										sideOffset={5}
									>
										Upload images
									</Tooltip.Content>
								</Tooltip.Portal>
							</Tooltip.Root>

							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								multiple
								onChange={handleImageUpload}
								className="hidden"
							/>

							{/* Textarea */}
							<textarea
								ref={textareaRef}
								value={prompt}
								onChange={(e) => setPrompt(e.target.value)}
								onKeyDown={handleKeyPress}
								placeholder={placeholder}
								rows={1}
								className="flex-1 bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground text-sm py-2 max-h-32 overflow-y-auto"
								style={{
									minHeight: "40px",
									height: "auto",
								}}
							/>

							{/* Tools Popover */}
							<Popover.Root open={isToolsOpen} onOpenChange={setIsToolsOpen}>
								<Popover.Trigger asChild>
									<Tooltip.Root>
										<Tooltip.Trigger asChild>
											<button
												className={cn(
													"flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted transition-colors",
													(webSearch || framework || planMode) &&
													"bg-primary/10 text-primary"
												)}
											>
												<Settings className="w-5 h-5" />
											</button>
										</Tooltip.Trigger>
										<Tooltip.Portal>
											<Tooltip.Content
												className="bg-popover text-popover-foreground px-3 py-1.5 rounded-lg text-sm shadow-md"
												sideOffset={5}
											>
												Tools & Settings
											</Tooltip.Content>
										</Tooltip.Portal>
									</Tooltip.Root>
								</Popover.Trigger>
								<Popover.Portal>
									<Popover.Content
										className="w-72 bg-popover border border-border rounded-xl shadow-xl p-2 z-50"
										sideOffset={5}
										align="end"
									>
										<div className="flex flex-col gap-1">
											<div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
												Tools & Options
											</div>

											{/* Web Search Toggle */}
											<button
												onClick={() => setWebSearch(!webSearch)}
												className={cn(
													"flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left",
													webSearch && "bg-primary/10"
												)}
											>
												<Search
													className={cn(
														"w-4 h-4",
														webSearch ? "text-primary" : "text-muted-foreground"
													)}
												/>
												<div className="flex-1">
													<div className="text-sm font-medium">Web Search</div>
													<div className="text-xs text-muted-foreground">
														Search the web for current information
													</div>
												</div>
												<div
													className={cn(
														"w-10 h-5 rounded-full transition-colors relative",
														webSearch ? "bg-primary" : "bg-muted"
													)}
												>
													<div
														className={cn(
															"absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform",
															webSearch ? "left-5" : "left-0.5"
														)}
													/>
												</div>
											</button>

											{/* Framework Selector */}
											<div className="px-3 py-2">
												<div className="text-sm font-medium mb-2">
													Framework
												</div>
												<div className="flex gap-2">
													<button
														onClick={() =>
															setFramework(framework === "next" ? null : "next")
														}
														className={cn(
															"flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors",
															framework === "next"
																? "bg-primary/10 border-primary text-primary"
																: "border-border hover:bg-muted"
														)}
													>
														<Code2 className="w-4 h-4" />
														<span className="text-sm">Next.js</span>
													</button>
													<button
														onClick={() =>
															setFramework(framework === "react" ? null : "react")
														}
														className={cn(
															"flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors",
															framework === "react"
																? "bg-primary/10 border-primary text-primary"
																: "border-border hover:bg-muted"
														)}
													>
														<Code2 className="w-4 h-4" />
														<span className="text-sm">React</span>
													</button>
												</div>
											</div>

											{/* Plan Mode Toggle */}
											<button
												onClick={() => setPlanMode(!planMode)}
												className={cn(
													"flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left",
													planMode && "bg-primary/10"
												)}
											>
												<div
													className={cn(
														"w-4 h-4 rounded border-2 flex items-center justify-center",
														planMode
															? "bg-primary border-primary"
															: "border-muted-foreground"
													)}
												>
													{planMode && (
														<svg
															className="w-3 h-3 text-primary-foreground"
															viewBox="0 0 12 12"
															fill="none"
														>
															<path
																d="M10 3L4.5 8.5L2 6"
																stroke="currentColor"
																strokeWidth="2"
																strokeLinecap="round"
																strokeLinejoin="round"
															/>
														</svg>
													)}
												</div>
												<div className="flex-1">
													<div className="text-sm font-medium">Plan Mode</div>
													<div className="text-xs text-muted-foreground">
														Create implementation plan first
													</div>
												</div>
											</button>
										</div>
									</Popover.Content>
								</Popover.Portal>
							</Popover.Root>

							{/* Mic Button */}
							<Tooltip.Root>
								<Tooltip.Trigger asChild>
									<button
										onClick={toggleRecording}
										className={cn(
											"flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
											isRecording
												? "bg-destructive text-destructive-foreground"
												: "hover:bg-muted text-muted-foreground hover:text-foreground"
										)}
									>
										<Mic className="w-5 h-5" />
									</button>
								</Tooltip.Trigger>
								<Tooltip.Portal>
									<Tooltip.Content
										className="bg-popover text-popover-foreground px-3 py-1.5 rounded-lg text-sm shadow-md"
										sideOffset={5}
									>
										{isRecording ? "Stop recording" : "Voice input"}
									</Tooltip.Content>
								</Tooltip.Portal>
							</Tooltip.Root>

							{/* Send Button */}
							<Tooltip.Root>
								<Tooltip.Trigger asChild>
									<button
										onClick={handleSubmit}
										disabled={!hasContent}
										className={cn(
											"flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
											hasContent
												? "bg-primary text-primary-foreground hover:brightness-105"
												: "bg-muted text-muted-foreground cursor-not-allowed"
										)}
									>
										<Send className="w-5 h-5" />
									</button>
								</Tooltip.Trigger>
								<Tooltip.Portal>
									<Tooltip.Content
										className="bg-popover text-popover-foreground px-3 py-1.5 rounded-lg text-sm shadow-md"
										sideOffset={5}
									>
										Send message
									</Tooltip.Content>
								</Tooltip.Portal>
							</Tooltip.Root>
						</div>
					</div>
				</div>

				{/* Image Preview Dialog */}
				<Dialog.Root
					open={selectedImage !== null}
					onOpenChange={(open) => !open && setSelectedImage(null)}
				>
					<Dialog.Portal>
						<Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" />
						<Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 max-w-3xl w-full max-h-[90vh] bg-background rounded-2xl shadow-2xl border border-border">
							<div className="relative w-full h-full p-6">
								<Dialog.Close className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors">
									<X className="w-4 h-4" />
								</Dialog.Close>
								{selectedImage && <LargeImagePreview image={selectedImage} />}
							</div>
						</Dialog.Content>
					</Dialog.Portal>
				</Dialog.Root>
			</div>
		</Tooltip.Provider>
	);
}
