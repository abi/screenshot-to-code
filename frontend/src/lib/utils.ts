import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import copy from "copy-to-clipboard";
import toast from "react-hot-toast";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const doCopyCode = (code: string) => {
  copy(code);
  toast.success("Copied to clipboard");
};
