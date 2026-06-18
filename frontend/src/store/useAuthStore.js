import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // Normalize user shape coming from backend/frontend storage
      normalizeUser: (user) => {
        if (!user) return user;
        const isAdminFlag =
          user.is_admin === true ||
          user.role === "admin" ||
          user.role === "super_admin";
        return {
          ...user,
          is_admin: isAdminFlag,
          admin_role: user.admin_role || user.role || null,
        };
      },

      setAuth: (user, token) => {
        const normalized = get().normalizeUser(user);
        localStorage.setItem("token", token);
        set({ user: normalized, token, isAuthenticated: true });
      },

      updateUser: (userData) => {
        const merged = { ...get().user, ...userData };
        const normalized = get().normalizeUser(merged);
        set({ user: normalized });
      },

      logout: () => {
        localStorage.removeItem("token");
        set({ user: null, token: null, isAuthenticated: false });
      },

      isAdmin: () => {
        const { user } = get();
        return user?.is_admin === true;
      },

      hasRole: (role) => {
        const { user } = get();
        return user?.admin_role === role;
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;
