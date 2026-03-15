import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
  /** Progress value 0–100 */
  value: number;
  /** Diameter in pixels. Default: 40 */
  size?: number;
  /** Stroke width in pixels. Default: 3 */
  strokeWidth?: number;
  className?: string;
  /** Optional content rendered in the center of the ring */
  children?: ReactNode;
}

/**
 * SVG-based circular progress ring.
 * Uses `currentColor` so it inherits whichever text color class is applied.
 *
 * @example
 * <CircularProgress value={75} size={48} className="text-primary">
 *   <span className="text-[10px] font-mono font-bold">75%</span>
 * </CircularProgress>
 */
export function CircularProgress({
  value,
  size = 40,
  strokeWidth = 3,
  className,
  children,
}: CircularProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clampedValue / 100);
  const center = size / 2;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        style={{ transform: "rotate(-90deg)" }}
      >
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          opacity={0.15}
        />
        {/* Progress */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
