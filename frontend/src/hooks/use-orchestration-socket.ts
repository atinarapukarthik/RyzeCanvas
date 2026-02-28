import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProject } from '@/lib/api';

export type OrchestrationEvent = {
    type: string;
    node?: string;
    message?: string;
    process?: string;
    fileName?: string;
    code?: string;
    status?: string;
    errors?: string[];
    patch?: string;
    rationale?: string;
    // Terminal / DevOps events
    command?: string;
    output?: string;
    exit_code?: number;
};

export function useOrchestrationSocket(projectId: string) {
    const [events, setEvents] = useState<OrchestrationEvent[]>([]);
    const [currentNode, setCurrentNode] = useState<string>('Architect');
    const [files, setFiles] = useState<Record<string, string>>({});
    const [buildStatus, setBuildStatus] = useState<'idle' | 'running' | 'FAIL' | 'PASS'>('idle');
    const [buildErrors, setBuildErrors] = useState<string[]>([]);
    const [healingPulse, setHealingPulse] = useState(false);
    const [circuitBreakerAlert, setCircuitBreakerAlert] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    const socketRef = useRef<WebSocket | null>(null);

    // Load project data from DB on mount
    useEffect(() => {
        if (!projectId) return;

        const loadProjectData = async () => {
            try {
                const project = await fetchProject(projectId);
                if (project && project.code) {
                    try {
                        // Try parsing as JSON (multi-file format)
                        const parsedFiles = JSON.parse(project.code);
                        if (typeof parsedFiles === 'object' && parsedFiles !== null) {
                            // Normalize backslash paths from Windows and filter empty/placeholder entries
                            const normalized: Record<string, string> = {};
                            for (const [key, value] of Object.entries(parsedFiles)) {
                                const cleanKey = key.replace(/\\\\/g, '/');
                                const strValue = String(value);
                                if (strValue && strValue.trim() !== '// Generated code') {
                                    normalized[cleanKey] = strValue;
                                }
                            }
                            if (Object.keys(normalized).length > 0) {
                                setFiles(normalized);
                                console.log(`[Orchestration] Loaded ${Object.keys(normalized).length} files from DB`);
                            }
                        } else {
                            // Single file fallback
                            setFiles({ 'page.tsx': project.code });
                        }
                    } catch (e) {
                        // Non-JSON fallback (legacy format)
                        if (project.code.trim() !== '// Generated code') {
                            setFiles({ 'page.tsx': project.code });
                        }
                    }
                }
            } catch (err) {
                console.error('[Orchestration] Failed to load initial project data', err);
            }
        };

        loadProjectData();
    }, [projectId]);

    useEffect(() => {
        if (!projectId) return;

        // Use environment variable or default to localhost
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const wsUrl = backendUrl.replace(/^https?:\/\//i, (match) =>
            match.toLowerCase() === 'https://' ? 'wss://' : 'ws://'
        ) + `/orchestration/ws/${projectId}`;

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log('[WS] Connected to Orchestration Socket', projectId);
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as OrchestrationEvent;

                setEvents((prev) => [...prev, data]);

                if (data.type === 'node_change' && data.node) {
                    setCurrentNode(data.node);
                    if (data.node !== 'Debugger') setHealingPulse(false);
                } else if (data.type === 'file_commit' && data.fileName && data.code) {
                    setFiles((prev) => ({ ...prev, [data.fileName!]: data.code! }));
                } else if (data.type === 'build_status' && data.status) {
                    setBuildStatus(data.status as 'FAIL' | 'PASS');
                    if (data.errors) {
                        setBuildErrors(data.errors);
                    }
                } else if (data.type === 'pulse_status' && data.status === 'healing') {
                    setHealingPulse(true);
                } else if (data.type === 'alert' && data.status === 'circuit_breaker') {
                    setCircuitBreakerAlert(true);
                } else if (data.type === 'log' && data.message?.includes('ALL TASKS COMPLETE')) {
                    setIsRunning(false);
                }
            } catch (e) {
                console.error('[WS] Failed to parse message', e);
            }
        };

        ws.onerror = () => {
            console.warn('[WS] WebSocket disconnected or encountered an error.');
            setIsConnected(false);
        };

        ws.onclose = () => {
            console.log('[WS] Disconnected from Orchestration Socket');
            setIsConnected(false);
            setIsRunning(false);
        };

        return () => {
            if (ws.readyState === WebSocket.CONNECTING) {
                ws.onopen = () => ws.close();
            } else {
                ws.close();
            }
        };
    }, [projectId]);

    const startOrchestration = useCallback((promptText?: string) => {
        // Reset state BEFORE sending the request to avoid race conditions
        setEvents([]);

        // Only wipe files if THIS IS A NEW START (no files yet)
        // If we already have files, stay incremental.
        if (Object.keys(files).length === 0) {
            setFiles({});
        }

        setBuildStatus('running');
        setBuildErrors([]);
        setHealingPulse(false);
        setCircuitBreakerAlert(false);
        setCurrentNode('Architect');
        setIsRunning(true);

        const ws = socketRef.current;

        // Prefer direct WebSocket message (no HTTP race condition)
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'start', prompt: promptText || 'Generate a basic UI component' }));
        } else {
            // Fallback to HTTP POST if WS isn't open yet
            const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
            fetch(`${backendUrl}/orchestration/start/${projectId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText || 'Generate a basic UI component' }),
            }).catch((err) => {
                console.error('[Orchestration] Failed to start via HTTP', err);
                setIsRunning(false);
                setBuildStatus('idle');
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, files]);

    return {
        events,
        currentNode,
        files,
        buildStatus,
        buildErrors,
        healingPulse,
        circuitBreakerAlert,
        isConnected,
        isRunning,
        startOrchestration,
    };
}
