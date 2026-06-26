import { create } from 'zustand';
import { authApi } from '../api/services';

function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const useAuthStore = create((set, get) => ({
  user:        getStoredUser(),
  isLoading:   false,
  error:       null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.login({ email, password });
      const { access_token, refresh_token, user } = data.data;
      localStorage.setItem('access_token',  access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user',          JSON.stringify(user));
      set({ user, isLoading: false });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try { await authApi.logout(refreshToken); } catch { /* silent */ }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    set({ user: null, error: null });
  },

  fetchMe: async () => {
    try {
      const { data } = await authApi.me();
      const user = data.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
    } catch {
      get().logout();
    }
  },

  clearError: () => set({ error: null }),
  isAuthenticated: () => !!get().user && !!localStorage.getItem('access_token'),
  hasRole: (...roles) => roles.includes(get().user?.role),
}));

export default useAuthStore;
