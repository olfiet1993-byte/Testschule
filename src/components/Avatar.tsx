import { cn } from "@/lib/utils";

const COLORS = [
  "#0ea5e9", // sky
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#a855f7", // purple
];

/** Determines stable color from string */
export function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

export type AvatarProps = {
  user: {
    id?: string;
    displayName: string;
    avatarEmoji?: string | null;
    avatarColor?: string | null;
  };
  size?: number;
  className?: string;
  ringColor?: string;
};

export function Avatar({ user, size = 36, className, ringColor }: AvatarProps) {
  const initials = initialsFor(user.displayName);
  const color = user.avatarColor || colorFor(user.id ?? user.displayName);

  const fontSize = Math.round(size * 0.4);
  const emojiSize = Math.round(size * 0.6);

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0 select-none",
        className
      )}
      style={{
        width: size,
        height: size,
        background: user.avatarEmoji ? "white" : color,
        fontSize,
        boxShadow: ringColor ? `0 0 0 2px ${ringColor}` : undefined,
        border: user.avatarEmoji ? "1px solid #e2e8f0" : "none",
      }}
      title={user.displayName}
    >
      {user.avatarEmoji ? (
        <span style={{ fontSize: emojiSize, lineHeight: 1 }}>{user.avatarEmoji}</span>
      ) : (
        initials
      )}
    </div>
  );
}
