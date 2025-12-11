import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "@/utils/cn";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className="relative h-2 w-full grow overflow-hidden rounded-full"
      style={{
        backgroundColor:
          "var(--vscode-input-background, hsl(var(--secondary)))",
        border: "1px solid var(--vscode-input-border, hsl(var(--border)))",
      }}
    >
      <SliderPrimitive.Range
        className="absolute h-full"
        style={{
          backgroundColor:
            "var(--vscode-progressBar-background, hsl(var(--primary)))",
        }}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="block h-5 w-5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      style={{
        backgroundColor: "var(--vscode-button-background, hsl(var(--primary)))",
        border:
          "2px solid var(--vscode-button-background, hsl(var(--primary)))",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
      }}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
