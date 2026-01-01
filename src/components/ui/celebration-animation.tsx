import * as React from "react";
import { cn } from "@/lib/utils";

interface CelebrationAnimationProps extends React.HTMLAttributes<HTMLDivElement> {
  show?: boolean;
  type?: "confetti" | "sparkle" | "firework";
}

const CelebrationAnimation = React.forwardRef<HTMLDivElement, CelebrationAnimationProps>(
  ({ className, show = true, type = "sparkle", ...props }, ref) => {
    const [particles, setParticles] = React.useState<Array<{
      id: number;
      x: number;
      y: number;
      color: string;
      delay: number;
      size: number;
    }>>([]);

    React.useEffect(() => {
      if (show) {
        const colors = [
          'hsl(0, 85%, 60%)',
          'hsl(45, 85%, 60%)',
          'hsl(90, 85%, 50%)',
          'hsl(180, 85%, 50%)',
          'hsl(270, 85%, 60%)',
          'hsl(315, 85%, 60%)',
        ];

        const newParticles = Array.from({ length: 20 }, (_, i) => ({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay: Math.random() * 0.5,
          size: Math.random() * 8 + 4,
        }));

        setParticles(newParticles);

        // Clear after animation
        const timer = setTimeout(() => {
          setParticles([]);
        }, 2000);

        return () => clearTimeout(timer);
      }
    }, [show]);

    if (!show || particles.length === 0) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "pointer-events-none fixed inset-0 z-50 overflow-hidden",
          className
        )}
        {...props}
      >
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute animate-[sparkle_1.5s_ease-out_forwards]"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`,
            }}
          >
            {type === "sparkle" && (
              <svg
                width={particle.size}
                height={particle.size}
                viewBox="0 0 24 24"
                fill={particle.color}
              >
                <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
              </svg>
            )}
            {type === "confetti" && (
              <div
                className="rounded-sm"
                style={{
                  width: particle.size,
                  height: particle.size * 1.5,
                  backgroundColor: particle.color,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            )}
          </div>
        ))}
      </div>
    );
  }
);
CelebrationAnimation.displayName = "CelebrationAnimation";

export { CelebrationAnimation };
