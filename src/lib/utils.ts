import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

export function xpForNextLevel(level: number): number {
  return 50 * level * level;
}

export const PFLEGE_LEVEL_TITLES = [
  "Auszubildende",
  "Lernende",
  "Praktikantin",
  "Helferin",
  "Assistentin",
  "Pflegefachkraft",
  "Erfahrene Fachkraft",
  "Stationsleitung",
  "Pflegeexpertin",
  "Pflegemeisterin",
];

export function levelTitle(level: number): string {
  return PFLEGE_LEVEL_TITLES[Math.min(level - 1, PFLEGE_LEVEL_TITLES.length - 1)] ?? "Meisterin";
}
