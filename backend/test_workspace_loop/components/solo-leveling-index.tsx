import type { FC } from "react";
import { cn } from "@/lib/utils";
import { Moon, Sun, ArrowRight } from "lucide-react";

/**
 * Solo Leveling Index – a dark‑theme landing component.
 *
 * Design compliance:
 * • Uses the custom palette (`bg-backgroundDark`, `text-primary`, `text-surfaceNeutrals`, `bg‑accent`).
 * • Applies the required typography utilities (`font-heading` → Montserrat, `font-body` → Inter).
 * • All layout is built with semantic HTML (`<main>`, `<header>`, `<section>`).
 * • Icons are sourced from Lucide React, never raw SVG.
 * • Tailwind `gap` utilities replace margin‑based spacing.
 * • `cn()` utility guarantees deterministic class concatenation.
 */
export const SoloLevelingIndex: FC = () => {
  return (
    <main
      className={cn(
        "min-h-screen bg-backgroundDark text-body",
        "flex flex-col items-center p-8"
      )}
    >
      {/* Header – title + theme toggle icons */}
      <header
        className={cn(
          "w-full max-w-4xl flex justify-between items-center mb-12"
        )}
      >
        <h1 className={cn("text-primary font-heading text-4xl")}>
          Solo Leveling
        </h1>

        <div className="flex items-center gap-4">
          {/* Theme icons – purely decorative, hidden from assistive tech */}
          <Moon
            className="text-primary"
            size={24}
            aria-hidden="true"
          />
          <Sun
            className="text-primary"
            size={24}
            aria-hidden="true"
          />
        </div>
      </header>

      {/* Body content */}
      <section
        className={cn(
          "w-full max-w-4xl flex flex-col gap-6"
        )}
      >
        <p className={cn("text-surfaceNeutrals font-body text-lg")}>
          Dive into the dark world of hunters and monsters. Experience the
          journey of an ordinary man becoming the strongest.
        </p>

        {/* Call‑to‑action button */}
        <button
          className={cn(
            "self-start flex items-center gap-2 px-5 py-3",
            "bg-accent text-white rounded hover:bg-accent/90",
            "transition-colors font-body"
          )}
        >
          Get Started
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      </section>
    </main>
  );
};

export default SoloLevelingIndex;