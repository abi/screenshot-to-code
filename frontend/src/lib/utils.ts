import { Instruction } from "@/types";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const handleInstructions = (instructions: string): string =>
  (JSON.parse(instructions) || [])
    .map(
      (line: Instruction) =>
        `- ${line.element} in the ${line.location} has a mistake: ${line.mistake}, please update: ${line.improvement}.`
    )
    .join("\n\n");

export const calculateMistakesNum = (instructions: string): number =>
  (JSON.parse(instructions) || []).length;
