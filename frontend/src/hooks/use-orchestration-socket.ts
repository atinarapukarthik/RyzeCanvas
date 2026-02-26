import { useState, useEffect, useCallback, useRef } from 'react';

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
    const [buildStatus, setBuildStatus] = useState<'pending' | 'FAIL' | 'PASS'>('pending');
    const [buildErrors, setBuildErrors] = useState<string[]>([]);
    const [healingPulse, setHealingPulse] = useState(false);
    const [circuitBreakerAlert, setCircuitBreakerAlert] = useState(false);

    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!projectId) return;

        // Use environment variable or default to localhost
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const wsUrl = backendUrl.replace(/^https?:\/\//i, (match) => match.toLowerCase() === 'https://' ? 'wss://' : 'ws://') + `/orchestration/ws/${projectId}`;

        socketRef.current = new WebSocket(wsUrl);

        socketRef.current.onopen = () => {
            console.log('Connected to Orchestration Socket', projectId);
        };

        socketRef.current.onmessage = (event) => {
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
            }
        };

        socketRef.current.onclose = () => {
            console.log('Disconnected from Orchestration Socket');
        };

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [projectId]);

    const startOrchestration = useCallback(async (promptText?: string) => {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        try {
            await fetch(`${backendUrl}/orchestration/start/${projectId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptText || "Generate a basic UI component" }),
            });
            // Optionally reset states before a new run
            setEvents([]);
            setFiles({});
            setBuildStatus('pending');
            setBuildErrors([]);
            setHealingPulse(false);
            setCircuitBreakerAlert(false);
        } catch (err) {
            console.error('Failed to start orchestration', err);
        }
    }, [projectId]);

    return {
        events,
        currentNode,
        files,
        buildStatus,
        buildErrors,
        healingPulse,
        circuitBreakerAlert,
        startOrchestration,
    };
}
