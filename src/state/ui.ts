import { create } from 'zustand';

interface UiState {
  searchOpen: boolean;
  mobileMenuOpen: boolean;
  quickViewProductId: string | null;
  openSearch: () => void;
  closeSearch: () => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  openQuickView: (productId: string) => void;
  closeQuickView: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  searchOpen: false,
  mobileMenuOpen: false,
  quickViewProductId: null,
  openSearch: () => set({ searchOpen: true, mobileMenuOpen: false }),
  closeSearch: () => set({ searchOpen: false }),
  openMobileMenu: () => set({ mobileMenuOpen: true, searchOpen: false }),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
  openQuickView: (productId) => set({ quickViewProductId: productId }),
  closeQuickView: () => set({ quickViewProductId: null }),
}));
