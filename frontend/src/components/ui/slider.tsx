import * as React from "react";
import { Slider as BaseSlider } from "@base-ui-components/react/slider";
import { cn } from "@/lib/utils";

function Slider({
  className,
  ...props
}: React.ComponentProps<typeof BaseSlider.Root>) {
  return (
    <BaseSlider.Root
      className={cn("relative w-full select-none", className)}
      {...props}
    >
      <BaseSlider.Control className="flex w-full items-center py-1.5">
        <BaseSlider.Track className="relative h-1.5 w-full grow rounded-full bg-muted">
          <BaseSlider.Indicator className="absolute h-full rounded-full bg-primary" />
          <BaseSlider.Thumb className="size-4 rounded-full bg-primary shadow ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}

export { Slider };
