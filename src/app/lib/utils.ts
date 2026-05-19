import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "./supabase"; // Make sure this path is correct

/**
 * Merges Tailwind CSS classes efficiently.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Supabase Shortcuts
 * These exports fix the "no exported member" errors in your page.tsx
 */

// Provides access to signIn, signOut, getUser, etc.
export const auth = supabase.auth;

// A helper for database queries (e.g., query('posts'))
export const query = (table: string) => supabase.from(table);

// A helper for storage/file uploads
export const upload = supabase.storage;

// You can also export the main client or specific table helpers
export const documents = () => supabase.from('documents');
export const analytics = () => supabase.from('analytics');