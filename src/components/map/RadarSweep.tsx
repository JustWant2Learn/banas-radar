import { cn } from "cn";

interface RadarSweepProps {
  active: boolean;
}

/** Soft scan overlay while heat data is loading. Hidden once the map is ready. */
export function RadarSweep({ active }: RadarSweepProps) {
  if (!active) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[400] overflow-hidden motion-reduce:hidden"
    >
      <div
        className={cn(
          "radar-sweep absolute left-1/2 top-1/2 aspect-square w-[160vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40",
          "[animation-duration:2.4s]",
        )}
      />
    </div>
  );
}
