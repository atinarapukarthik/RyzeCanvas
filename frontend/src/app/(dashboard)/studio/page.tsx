"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Copy, GitFork, Rocket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createProject } from "@/lib/api";
import type { ChatMessage } from "@/lib/api";
import { toast } from "sonner";
import Prism from "prismjs";
import "prismjs/components/prism-jsx";
import "prismjs/themes/prism-tomorrow.css";

export default function Studio() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [thinking, setThinking] = useState(false);
    const [currentCode, setCurrentCode] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const codeRef = useRef<HTMLElement>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (codeRef.current && currentCode) {
            Prism.highlightElement(codeRef.current);
        }
    }, [currentCode, mounted]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, thinking, mounted]);

    const handleSend = async () => {
        if (!input.trim() || thinking) return;
        const userMsg: ChatMessage = { id: `m${Date.now()}`, role: "user", content: input, timestamp: new Date().toISOString() };
        setMessages((m) => [...m, userMsg]);
        setInput("");
        setThinking(true);

        try {
            const project = await createProject(input);
            const aiMsg: ChatMessage = {
                id: `m${Date.now() + 1}`,
                role: "assistant",
                content: `Here's a **${project.title}** component based on your prompt. Check the Preview and Code tabs on the right.`,
                timestamp: new Date().toISOString(),
            };
            setMessages((m) => [...m, aiMsg]);
            setCurrentCode(project.code);
            toast.success("UI generated successfully!");
        } catch {
            toast.error("Generation failed");
        } finally {
            setThinking(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(currentCode);
        toast.success("Code copied to clipboard");
    };

    if (!mounted) return null;

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-3rem)]">
            {/* Chat Panel */}
            <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-border min-h-0">
                <div className="px-4 py-3 border-b border-border shrink-0">
                    <h2 className="text-sm font-semibold">Chat</h2>
                </div>
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                                <p className="text-lg font-medium">What would you like to build?</p>
                                <p className="text-sm mt-1">Describe a UI component and I'll generate it for you.</p>
                            </div>
                        )}
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "glass-card"}`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {thinking && (
                            <div className="flex justify-start">
                                <div className="glass-card px-4 py-2.5 text-sm flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    AI is planning UI...
                                </div>
                            </div>
                        )}
                        <div ref={scrollRef} />
                    </div>
                </ScrollArea>
                <div className="p-4 border-t border-border shrink-0">
                    <div className="flex items-center gap-2 glass-card p-2">
                        <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                            <Paperclip className="h-4 w-4" />
                        </button>
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                            placeholder="Describe a UI component..."
                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <Button size="sm" onClick={handleSend} disabled={thinking || !input.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Preview Panel */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-2 border-b border-border flex items-center justify-between shrink-0">
                    <Tabs defaultValue="preview" className="w-full">
                        <div className="flex items-center justify-between">
                            <TabsList className="h-8">
                                <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
                                <TabsTrigger value="code" className="text-xs">Code</TabsTrigger>
                            </TabsList>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={copyCode} disabled={!currentCode}><Copy className="h-3.5 w-3.5 mr-1" />Copy</Button>
                                <Button variant="ghost" size="sm"><GitFork className="h-3.5 w-3.5 mr-1" />Fork</Button>
                                <Button variant="ghost" size="sm"><Rocket className="h-3.5 w-3.5 mr-1" />Deploy</Button>
                            </div>
                        </div>

                        <TabsContent value="preview" className="mt-0">
                            <div className="h-[calc(100vh-8rem)] flex items-center justify-center text-muted-foreground">
                                {currentCode ? (
                                    <div className="glass-card p-8 text-center">
                                        <p className="text-sm font-medium">Preview Rendered</p>
                                        <p className="text-xs mt-1">Component generated from your prompt</p>
                                    </div>
                                ) : (
                                    <p className="text-sm">Generated UI will appear here</p>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="code" className="mt-0">
                            <ScrollArea className="h-[calc(100vh-8rem)]">
                                <pre className="p-4 text-sm">
                                    <code ref={codeRef} className="language-jsx">
                                        {currentCode || "// Your generated code will appear here"}
                                    </code>
                                </pre>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
