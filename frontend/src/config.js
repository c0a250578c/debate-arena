/**
 * Centralized configuration — environment variables and constants.
 */
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';
export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
export const TICKET_SHOP_URL = import.meta.env.VITE_TICKET_SHOP_URL || '';
export const AUTH_DEV_MODE = !CLERK_PUBLISHABLE_KEY; // Clerkキーが未設定なら開発モード

export const AUTH_STORAGE_KEY = 'debate-arena-auth-token';
