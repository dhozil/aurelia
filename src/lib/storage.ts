import type { ChatMessage } from "./genlayer-service";

const STORAGE_KEYS = {
  SAVED_CHATS: "aurelia_saved_chats",
  WATCHLIST: "aurelia_watchlist",
  MEMORY: "aurelia_memory",
} as const;

export interface SavedChat {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  addedAt: string;
}

export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  createdAt: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadFromStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Saved Chats
export function getSavedChats(): SavedChat[] {
  return loadFromStorage<SavedChat>(STORAGE_KEYS.SAVED_CHATS);
}

export function saveChat(messages: ChatMessage[]): SavedChat | null {
  if (messages.length === 0) return null;

  const firstUserMsg = messages.find((m) => m.role === "user");
  const title = firstUserMsg
    ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? "..." : "")
    : "New Chat";

  const chat: SavedChat = {
    id: generateId(),
    title,
    messages,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const chats = getSavedChats();
  chats.unshift(chat);
  saveToStorage(STORAGE_KEYS.SAVED_CHATS, chats);
  return chat;
}

export function deleteSavedChat(id: string): void {
  const chats = getSavedChats().filter((c) => c.id !== id);
  saveToStorage(STORAGE_KEYS.SAVED_CHATS, chats);
}

// Watchlist
export function getWatchlist(): WatchlistItem[] {
  return loadFromStorage<WatchlistItem>(STORAGE_KEYS.WATCHLIST);
}

export function addToWatchlist(symbol: string, name: string): WatchlistItem | null {
  const watchlist = getWatchlist();
  if (watchlist.some((w) => w.symbol.toLowerCase() === symbol.toLowerCase())) {
    return null;
  }

  const item: WatchlistItem = {
    id: generateId(),
    symbol: symbol.toUpperCase(),
    name,
    addedAt: new Date().toISOString(),
  };

  watchlist.unshift(item);
  saveToStorage(STORAGE_KEYS.WATCHLIST, watchlist);
  return item;
}

export function removeFromWatchlist(id: string): void {
  const watchlist = getWatchlist().filter((w) => w.id !== id);
  saveToStorage(STORAGE_KEYS.WATCHLIST, watchlist);
}

// Memory
export function getMemory(): MemoryItem[] {
  return loadFromStorage<MemoryItem>(STORAGE_KEYS.MEMORY);
}

export function addMemory(key: string, value: string): MemoryItem {
  const memory = getMemory();
  const existing = memory.find((m) => m.key.toLowerCase() === key.toLowerCase());

  if (existing) {
    existing.value = value;
    saveToStorage(STORAGE_KEYS.MEMORY, memory);
    return existing;
  }

  const item: MemoryItem = {
    id: generateId(),
    key,
    value,
    createdAt: new Date().toISOString(),
  };

  memory.push(item);
  saveToStorage(STORAGE_KEYS.MEMORY, memory);
  return item;
}

export function removeMemory(id: string): void {
  const memory = getMemory().filter((m) => m.id !== id);
  saveToStorage(STORAGE_KEYS.MEMORY, memory);
}
