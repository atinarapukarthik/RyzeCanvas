/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { FC } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

// --- Types matching component_library.py ---

export interface ComponentNode {
    id: string;
    type: string;
    props?: Record<string, any>;
    position?: { x: number; y: number };
    styles?: Record<string, any>;
    children?: ComponentNode[];
}

export interface UIPlan {
    components: ComponentNode[];
    layout?: {
        theme?: string;
        grid?: boolean;
        gridSize?: number;
        canvasSize?: { width: number; height: number };
    };
}

interface DynamicRendererProps {
    plan: UIPlan;
}

// --- Component Mappings ---

const IconRenderer = ({ name, className }: { name: string; className?: string }) => {
    const Icon = (LucideIcons as any)[name];
    return Icon ? <Icon className={className} /> : null;
};

const safeRender = (content: any) => {
    if (typeof content === 'string' || typeof content === 'number') return content;
    if (typeof content === 'object' && content !== null) {
        // If it's a component node (Plan), we can't easily render it recursively here
        // without cyclic dependencies. For now, stringify it to avoid crash + debug.
        return JSON.stringify(content);
    }
    return null;
};

const RenderButton: FC<{ props: any; styles: any }> = ({ props, styles }) => (
    <Button
        variant={props.variant || 'default'}
        size={props.size || 'default'}
        className={cn(styles?.className)}
        style={styles}
    >
        {props.icon && <IconRenderer name={props.icon} className="mr-2 h-4 w-4" />}
        {safeRender(props.label) || 'Button'}
    </Button>
);

const RenderCard: FC<{ props: any; styles: any; children?: React.ReactNode }> = ({ props, styles, children }) => (
    <Card className={cn("w-full", styles?.className)} style={styles}>
        {(props.title || props.description) && (
            <CardHeader>
                {props.title && <CardTitle>{safeRender(props.title)}</CardTitle>}
                {props.description && <CardDescription>{safeRender(props.description)}</CardDescription>}
            </CardHeader>
        )}
        <CardContent>
            {safeRender(props.content)}
            {children}
        </CardContent>
        {props.footer && <CardFooter>{safeRender(props.footer)}</CardFooter>}
    </Card>
);

const RenderInput: FC<{ props: any; styles: any }> = ({ props, styles }) => (
    <div className={cn("grid w-full max-w-sm items-center gap-1.5", styles?.className)} style={styles}>
        {props.label && <Label htmlFor={props.id}>{safeRender(props.label)}</Label>}
        <Input type={props.type || 'text'} id={props.id} placeholder={props.placeholder} />
    </div>
);

const RenderText: FC<{ props: any; styles: any }> = ({ props, styles }) => {
    const Tag = props.tag || 'p';
    return (
        <Tag className={cn(styles?.className)} style={styles}>
            {safeRender(props.content)}
        </Tag>
    );
};

const RenderContainer: FC<{ props: any; styles: any; children?: React.ReactNode }> = ({ styles, children }) => (
    <div className={cn("flex flex-col gap-4", styles?.className)} style={styles}>
        {children}
    </div>
);

const RenderNavbar: FC<{ props: any; styles: any }> = ({ props, styles }) => (
    <div className={cn("flex items-center justify-between p-4 border-b bg-card text-card-foreground shadow-sm", styles?.className)} style={styles}>
        <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {props.logo && <img src={props.logo} alt="Logo" className="h-6 w-6" />}
            <span className="font-bold text-lg">{props.title}</span>
        </div>
        <div className="flex gap-4">
            {props.items?.map((item: string) => (
                <Button key={item} variant="ghost" size="sm" className="text-sm font-medium">{item}</Button>
            ))}
        </div>
    </div>
);

const RenderForm: FC<{ props: any; styles: any }> = ({ props, styles }) => (
    <form className={cn("grid gap-4 p-6 border rounded-xl bg-card text-card-foreground shadow-sm", styles?.className)} style={styles} onSubmit={(e) => e.preventDefault()}>
        {props.title && <h3 className="font-semibold text-xl mb-2">{props.title}</h3>}
        {props.fields?.map((field: any, idx: number) => (
            <div key={idx} className="grid gap-2">
                <Label>{field.label}{field.required && <span className="text-destructive">*</span>}</Label>
                {field.type === 'textarea' ? (
                    <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder={field.placeholder || ''} />
                ) : (
                    <Input type={field.type || 'text'} placeholder={field.placeholder || ''} />
                )}
            </div>
        ))}
        <Button type="submit" className="mt-4 w-full">{props.submitLabel || "Submit"}</Button>
    </form>
);

const RenderTable: FC<{ props: any; styles: any }> = ({ props, styles }) => {
    // Helper to safely extract cells from a row, regardless of its type
    const getCells = (row: any): any[] => {
        if (Array.isArray(row)) return row;
        if (typeof row === 'object' && row !== null) return Object.values(row);
        return [row];
    };

    return (
        <div className="w-full overflow-auto border rounded-lg" style={styles}>
            <Table>
                <TableHeader>
                    <TableRow>
                        {props.columns?.map((col: string) => <TableHead key={col}>{col}</TableHead>)}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {props.data?.map((row: any, i: number) => {
                        const cells = getCells(row);
                        return (
                            <TableRow key={i}>
                                {cells.map((cell: any, j: number) => (
                                    <TableCell key={j}>
                                        {/* Handle objects/arrays in cells gracefully */}
                                        {typeof cell === 'object' && cell !== null
                                            ? JSON.stringify(cell)
                                            : String(cell)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};

// Map of allowed components to their renderers
const COMPONENT_MAP: Record<string, FC<any>> = {
    Button: RenderButton,
    Card: RenderCard,
    Input: RenderInput,
    Text: RenderText,
    Container: RenderContainer,
    Navbar: RenderNavbar,
    Form: RenderForm,
    Table: RenderTable,
    // Fallbacks for others or simple implementations
    // eslint-disable-next-line @next/next/no-img-element
    Image: ({ props, styles }) => <img src={props.src} alt={props.alt} className={cn("rounded-md", styles?.className)} style={styles} />,
    Checkbox: ({ props, styles }) => (
        <div className="flex items-center space-x-2" style={styles}>
            <Checkbox id={props.id} />
            <Label htmlFor={props.id}>{props.label}</Label>
        </div>
    ),
    Select: ({ props, styles }) => (
        <Select>
            <SelectTrigger className={cn("w-[180px]", styles?.className)} style={styles}>
                <SelectValue placeholder={props.placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
                {props.options?.map((opt: { value: string; label: string }) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    ),
};

// --- Recursive Renderer ---

const RenderNode: FC<{ node: ComponentNode }> = ({ node }) => {
    const Component = COMPONENT_MAP[node.type];

    if (!Component) {
        return (
            <div className="border border-red-500 p-2 rounded text-red-500 text-xs">
                Unknown component: {node.type}
            </div>
        );
    }

    // Handle positioning if provided (absolute) or default (static/flex)
    const style = {
        ...node.styles,
        ...(node.position ? {
            position: 'absolute',
            left: `${node.position.x}px`,
            top: `${node.position.y}px`,
        } : {})
    };

    return (
        <Component props={node.props || {}} styles={style}>
            {node.children?.map(child => (
                <RenderNode key={child.id} node={child} />
            ))}
        </Component>
    );
};

// --- Main Export ---

export const DynamicRenderer: FC<DynamicRendererProps> = ({ plan }) => {
    if (!plan || !plan.components) return null;

    const isAbsoluteLayout = plan.components.some(c => c.position);
    const themeClass = plan.layout?.theme === 'dark' ? 'dark' : '';

    return (
        <div className={cn(
            "w-full h-full min-h-[500px] bg-background text-foreground p-8 overflow-auto",
            themeClass,
            isAbsoluteLayout ? "relative" : "flex flex-col gap-4"
        )}>
            {plan.components.map((node, index) => (
                <RenderNode key={node.id || index} node={node} />
            ))}
        </div>
    );
};
