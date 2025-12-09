import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const GridBackground = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div className="absolute flex h-full w-full items-center justify-center bg-primary z-[-1000]">
      <div
        ref={ref}
        className={cn(
          "absolute inset-0",
          "bg-size-[40px_40px]",
          "bg-[linear-gradient(to_right,#333333_1px,transparent_1px),linear-gradient(to_bottom,#333333_1px,transparent_1px)]",
        )}
      />
      {/* Radial gradient for the container to give a faded look */}
      <div className="absolute inset-0 flex items-center justify-center bg-primary mask-[radial-gradient(ellipse_at_center,transparent_20%,black)] dark:bg-black"></div>
    </div>
  );
})
