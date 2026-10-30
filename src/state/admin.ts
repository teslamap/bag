import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setMobileNav: (open: boolean) => void;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sidebarCollapsed: false,
      mobileNavOpen: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setMobileNav: (open) => set({ mobileNavOpen: open }),
    }),
    {
      name: 'maku.admin.v1',
      partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
