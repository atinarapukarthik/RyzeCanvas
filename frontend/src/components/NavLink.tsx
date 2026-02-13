"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface NavLinkProps extends Omit<React.ComponentPropsWithoutRef<typeof Link>, "className" | "href"> {
  to: string; // Used as href
  className?: string;
  activeClassName?: string;
  end?: boolean;
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, to, end, ...props }, ref) => {
    const pathname = usePathname();

    const isActive = end
      ? pathname === to
      : pathname === to || pathname?.startsWith(to + "/");

    return (
      <Link
        ref={ref}
        href={to}
        className={cn(className, isActive && activeClassName)}
        {...props}
      />
    );
  }
);

NavLink.displayName = "NavLink";
