import { create } from "zustand";
import {
  isVulnerableGroupId,
  uniqueGroups,
  type VulnerableGroupId,
} from "@/lib/vulnerable";

const STORAGE_KEY = "banas:profile:groups";

interface ProfileState {
  groups: VulnerableGroupId[];
  hydrated: boolean;
  hydrate: () => void;
  toggleGroup: (id: VulnerableGroupId) => void;
  clearGroups: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  groups: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ groups: readStoredGroups(), hydrated: true });
  },
  toggleGroup: (id) => {
    const current = get().groups;
    const next = current.includes(id) ? current.filter((group) => group !== id) : [...current, id];
    const groups = uniqueGroups(next);
    persistGroups(groups);
    set({ groups, hydrated: true });
  },
  clearGroups: () => {
    persistGroups([]);
    set({ groups: [], hydrated: true });
  },
}));

function readStoredGroups(): VulnerableGroupId[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return uniqueGroups(parsed.filter(isVulnerableGroupId));
  } catch {
    return [];
  }
}

function persistGroups(groups: readonly VulnerableGroupId[]): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch {
    // Private mode / quota — mode still works for this session.
  }
}
