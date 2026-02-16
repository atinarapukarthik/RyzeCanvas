"use client";

import * as React from "react";
import Image from "next/image";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { fetchAvailableModels } from "@/lib/api";
import type { AIModel, AIProvider } from "@/components/ProviderSelector";

// --- Radix Primitives ---
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { showArrow?: boolean }
>(({ className, sideOffset = 4, showArrow = false, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "relative z-50 max-w-[280px] rounded-md bg-popover text-popover-foreground px-1.5 py-1 text-xs animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    >
      {props.children}
      {showArrow && <TooltipPrimitive.Arrow className="-my-px fill-popover" />}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-64 rounded-xl bg-popover dark:bg-[#303030] p-2 text-popover-foreground dark:text-white shadow-md outline-none animate-in data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] gap-4 border-none bg-transparent p-0 shadow-none duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    >
      <div className="relative bg-card dark:bg-[#303030] rounded-[28px] overflow-hidden shadow-2xl p-1">
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-full bg-background/50 dark:bg-[#303030] p-1 hover:bg-accent dark:hover:bg-[#515151] transition-all">
          <XIcon className="h-5 w-5 text-muted-foreground dark:text-gray-200 hover:text-foreground dark:hover:text-white" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// --- SVG Icon Components ---
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 5V19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Settings2Icon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 7h-9" />
    <path d="M14 17H5" />
    <circle cx="17" cy="17" r="3" />
    <circle cx="7" cy="7" r="3" />
  </svg>
);

const SendIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 5.25L12 18.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.75 12L12 5.25L5.25 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const GlobeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const MessageSquareIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const CpuIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M15 2v2" /><path d="M15 20v2" /><path d="M2 15h2" /><path d="M2 9h2" />
    <path d="M20 15h2" /><path d="M20 9h2" /><path d="M9 2v2" /><path d="M9 20v2" />
  </svg>
);

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const MicIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
  </svg>
);

// toolsList removed - unused

// Fallback models if API fetch fails
const PROMPTBOX_FALLBACK_MODELS: AIModel[] = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "gemini" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "gemini" },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "claude" },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
];

// --- PromptBox Component ---
interface PromptBoxProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onSend?: (message: string, mode?: "plan" | "build", options?: { webSearch?: boolean }) => void;
  onToolChange?: (toolId: string | null) => void;
  onModeChange?: (mode: "plan" | "build") => void;
  onWebSearchChange?: (enabled: boolean) => void;
  isTranscribing?: boolean;
  showModelSelector?: boolean;
}

export const PromptBox = React.forwardRef<HTMLTextAreaElement, PromptBoxProps>(
  ({ className, onSend, onToolChange, onModeChange, onWebSearchChange, isTranscribing = false, showModelSelector = true, ...props }, ref) => {
    const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const audioChunksRef = React.useRef<Blob[]>([]);
    const [value, setValue] = React.useState("");
    const [imagePreview, setImagePreview] = React.useState<string | null>(null);
    const [webSearchActive, setWebSearchActive] = React.useState(false);
    const [chatModeActive, setChatModeActive] = React.useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
    const [isModelPopoverOpen, setIsModelPopoverOpen] = React.useState(false);
    const [isImageDialogOpen, setIsImageDialogOpen] = React.useState(false);
    const [isRecording, setIsRecording] = React.useState(false);
    const [models, setModels] = React.useState<AIModel[]>(PROMPTBOX_FALLBACK_MODELS);

    const { selectedModel, setSelectedModel } = useUIStore();

    React.useImperativeHandle(ref, () => internalTextareaRef.current!, []);

    // Fetch available models
    React.useEffect(() => {
      let cancelled = false;
      fetchAvailableModels()
        .then((data) => {
          if (cancelled) return;
          if (data.models && data.models.length > 0) {
            setModels(
              data.models.map((m: { id: string; name: string; provider: string }) => ({
                id: m.id,
                name: m.name,
                provider: m.provider as AIProvider,
              }))
            );
          }
        })
        .catch(() => { /* keep fallback models */ });
      return () => { cancelled = true; };
    }, []);

    React.useLayoutEffect(() => {
      const textarea = internalTextareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        const newHeight = Math.min(textarea.scrollHeight, 200);
        textarea.style.height = `${newHeight}px`;
      }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      if (props.onChange) props.onChange(e);
    };

    const handlePlusClick = () => {
      fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
      event.target.value = "";
    };

    const handleRemoveImage = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    };

    const handleSend = () => {
      if (value.trim() && onSend) {
        const mode = chatModeActive ? "plan" : "build";
        onSend(value.trim(), mode, { webSearch: webSearchActive });
        setValue("");
        setImagePreview(null);
      }
    };

    const handleVoiceRecording = async () => {
      if (isRecording) {
        // Stop recording
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
      } else {
        // Start recording
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
            audioChunksRef.current.push(event.data);
          };

          mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
            const formData = new FormData();
            formData.append("audio", audioBlob, "recording.wav");

            try {
              // Use backend transcription endpoint
              const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
              const response = await fetch(`${API_BASE_URL}/audio/transcribe`, {
                method: "POST",
                body: formData,
              });

              if (response.ok) {
                const data = await response.json();
                if (data.text) {
                  setValue(data.text);
                }
              }
            } catch (error) {
              console.error("Transcription error:", error);
            }

            stream.getTracks().forEach((track) => track.stop());
          };

          mediaRecorder.start();
          setIsRecording(true);
        } catch (error) {
          console.error("Microphone access denied:", error);
        }
      }
    };

    const hasValue = value.trim().length > 0 || imagePreview;

    return (
      <div
        className={cn(
          "flex flex-col rounded-[28px] p-2 shadow-sm transition-colors bg-white/5 border border-white/10 backdrop-blur-xl cursor-text",
          className
        )}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

        {imagePreview && (
          <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
            <div className="relative mb-1 w-fit rounded-[1rem] px-1 pt-1">
              <button type="button" className="transition-transform" onClick={() => setIsImageDialogOpen(true)}>
                <Image
                  src={imagePreview}
                  alt="Image preview"
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-[1rem] object-cover"
                  unoptimized
                />
              </button>
              <button
                onClick={handleRemoveImage}
                className="absolute right-2 top-2 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-white/50 dark:bg-[#303030] text-black dark:text-white transition-colors hover:bg-accent dark:hover:bg-[#515151]"
                aria-label="Remove image"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <DialogContent>
              <Image
                src={imagePreview}
                alt="Full size preview"
                width={1200}
                height={800}
                className="w-full max-h-[95vh] object-contain rounded-[24px]"
                unoptimized
              />
            </DialogContent>
          </Dialog>
        )}

        <textarea
          ref={internalTextareaRef}
          rows={1}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="What do you want to build?"
          className="custom-scrollbar w-full resize-none border-0 bg-transparent p-3 text-white placeholder:text-white/40 focus:ring-0 focus-visible:outline-none min-h-12"
          {...props}
        />

        <div className="mt-0.5 p-1 pt-0">
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handlePlusClick}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 focus-visible:outline-none"
                  >
                    <PlusIcon className="h-6 w-6" />
                    <span className="sr-only">Attach image</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow={true}>
                  <p>Attach image</p>
                </TooltipContent>
              </Tooltip>

              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 items-center gap-2 rounded-full p-2 text-sm text-white/70 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-ring"
                      >
                        <Settings2Icon className="h-4 w-4" />
                        Tools
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow={true}>
                    <p>Tools</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent side="top" align="start">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setWebSearchActive(!webSearchActive);
                        setIsPopoverOpen(false);
                        onWebSearchChange?.(!webSearchActive);
                        onToolChange?.(!webSearchActive ? "searchWeb" : null);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-white/10",
                        webSearchActive && "bg-white/10 text-[hsl(234,89%,74%)]"
                      )}
                    >
                      <GlobeIcon className="h-4 w-4" />
                      <span>Search in web</span>
                      {webSearchActive && <CheckIcon className="h-3 w-3 ml-auto" />}
                    </button>
                  </div>
                </PopoverContent>
              </Popover>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      const newActive = !chatModeActive;
                      setChatModeActive(newActive);
                      const newMode = newActive ? "plan" : "build";
                      onModeChange?.(newMode);
                    }}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-full px-2 text-sm transition-colors focus-visible:outline-none cursor-pointer",
                      chatModeActive
                        ? "bg-white/10 text-[hsl(234,89%,74%)]"
                        : "text-white/70 hover:bg-white/10"
                    )}
                  >
                    <MessageSquareIcon className="h-4 w-4" />
                    Chat
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow={true}>
                  <p>{chatModeActive ? "Switch to Build mode" : "Switch to Plan/Chat mode"}</p>
                </TooltipContent>
              </Tooltip>

              {/* Active toggles indicators */}
              {(webSearchActive || chatModeActive) && (
                <div className="h-4 w-px bg-white/20" />
              )}

              {webSearchActive && (
                <button
                  onClick={() => {
                    setWebSearchActive(false);
                    onWebSearchChange?.(false);
                    onToolChange?.(null);
                  }}
                  className="flex h-8 items-center gap-2 rounded-full px-2 text-sm bg-white/10 text-[hsl(234,89%,74%)] hover:bg-white/15 cursor-pointer transition-colors"
                >
                  <GlobeIcon className="h-4 w-4" />
                  Web
                  <XIcon className="h-3 w-3" />
                </button>
              )}

              {chatModeActive && (
                <button
                  onClick={() => {
                    setChatModeActive(false);
                    onModeChange?.("build");
                  }}
                  className="flex h-8 items-center gap-2 rounded-full px-2 text-sm bg-white/10 text-amber-400 hover:bg-white/15 cursor-pointer transition-colors"
                >
                  <MessageSquareIcon className="h-4 w-4" />
                  Plan
                  <XIcon className="h-3 w-3" />
                </button>
              )}

              {/* Model Selector */}
              {showModelSelector && (
                <Popover open={isModelPopoverOpen} onOpenChange={setIsModelPopoverOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 focus-visible:outline-none cursor-pointer border border-white/10"
                        >
                          <CpuIcon className="h-3.5 w-3.5" />
                          <span className="max-w-[100px] truncate text-xs">{selectedModel?.name || "Model"}</span>
                          <ChevronDownIcon className="h-3 w-3 opacity-50" />
                        </button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top" showArrow={true}>
                      <p>Select AI Model</p>
                    </TooltipContent>
                  </Tooltip>
                  <PopoverContent side="top" align="start" className="w-56 max-h-64 overflow-y-auto">
                    <div className="text-[10px] uppercase tracking-widest text-white/40 font-semibold px-2 py-1">
                      Select Model
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedModel(model);
                            setIsModelPopoverOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-white/10 transition-colors",
                            selectedModel?.id === model.id && "bg-white/10 text-[hsl(234,89%,74%)]"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <CpuIcon className="h-3 w-3 opacity-60" />
                            <span className="truncate">{model.name}</span>
                          </div>
                          {selectedModel?.id === model.id && <CheckIcon className="h-3 w-3 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              <div className="ml-auto flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleVoiceRecording}
                      disabled={isTranscribing}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none relative",
                        isRecording
                          ? "bg-red-500/30 text-red-400 hover:bg-red-500/40"
                          : "text-white/70 hover:bg-white/10",
                        isTranscribing && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isTranscribing ? (
                        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <MicIcon className="h-5 w-5" />
                      )}
                      <span className="sr-only">Record voice</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow={true}>
                    <p>{isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Record voice"}</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!hasValue}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none bg-white text-black hover:bg-white/80 disabled:bg-white/20 disabled:text-white/30"
                    >
                      <SendIcon className="h-6 w-6 text-bold" />
                      <span className="sr-only">Send message</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow={true}>
                    <p>Send</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </div>
    );
  }
);
PromptBox.displayName = "PromptBox";
