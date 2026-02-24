import { createContext, useContext, type ReactNode, type ComponentType } from 'react';
import { cn } from '@/lib/utils';

/**
 * Context shape that supplies default Lucide‑React icon props.
 * - `size` – pixel size of the SVG (default 24)
 * - `strokeWidth` – SVG stroke width (default 2)
 * - `className` – Tailwind classes applied to every icon; we always include
 *   `stroke-current` so the icon inherits the surrounding text colour.
 *
 * By using `stroke-current` the icon automatically follows the theme
 * (`text-gray-800` in light mode, `dark:text-gray-200` in dark mode) without
 * needing to manually pass a colour prop.
 */
type IconContextValue = {
  size: number;
  strokeWidth: number;
  className: string;
};

const IconContext = createContext<IconContextValue>({
  size: 24,
  strokeWidth: 2,
  className: '',
});

/**
 * Props for the provider component.
 *
 * `size` and `strokeWidth` are optional – they fall back to Lucide defaults.
 * `className` lets callers add extra Tailwind utilities (e.g. `text-primary`).
 *
 * The provider is a **Server Component** by default (no client‑only hooks are used),
 * making it cheap to render at the edge.
 */
type IconProviderProps = {
  children: ReactNode;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

/**
 * IconProvider – wraps a subtree and injects default icon styling.
 *
 * Example:
 * ```tsx
 * <IconProvider className="text-gray-800 dark:text-gray-200">
 *   <MyComponent />
 * </IconProvider>
 * ```
 *
 * All Lucide icons rendered inside will inherit the colour from the surrounding
 * text (thanks to `stroke-current`) and will use the supplied size / stroke width.
 */
export const IconProvider = ({
  children,
  size = 24,
  strokeWidth = 2,
  className,
}: IconProviderProps) => {
  const contextValue: IconContextValue = {
    size,
    strokeWidth,
    // always include `stroke-current` so colour follows the theme
    className: cn('stroke-current', className),
  };

  return (
    <IconContext.Provider value={contextValue}>{children}</IconContext.Provider>
  );
};

/**
 * Hook to read the current icon defaults.
 */
export const useIconContext = () => useContext(IconContext);

/**
 * Reusable Icon component that pulls defaults from the nearest IconProvider.
 *
 * `as` – the Lucide‑React icon component (e.g. `Home`, `Search`).
 * `className` – optional extra Tailwind classes for this specific icon.
 *
 * The component forwards `size`, `strokeWidth` and the merged `className`
 * to the underlying SVG.
 */
type IconProps = {
  /** Lucide‑React icon component */
  as: ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Additional Tailwind classes for this icon instance */
  className?: string;
};

export const Icon = ({ as: IconComponent, className }: IconProps) => {
  const { size, strokeWidth, className: ctxClass } = useIconContext();

  return (
    <IconComponent
      size={size}
      strokeWidth={strokeWidth}
      className={cn(ctxClass, className)}
    />
  );
};