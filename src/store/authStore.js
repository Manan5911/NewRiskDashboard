// src/store/authStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { loginApi, trackLogin } from '../api/auth';

export const useAuthStore = create(devtools((set) => ({
  user: null,
  role: null,
  token: null,
  rolesList: [],
  isAuthenticated: false,

  login: async (username, password) => {
    const { user, role, token, rolesList } = await loginApi(username, password);

    sessionStorage.setItem('x-auth-token', token);
    sessionStorage.setItem('UserName', user);
    sessionStorage.setItem('Role', role);
    sessionStorage.setItem('RolesList', JSON.stringify(rolesList)); // add this

    trackLogin(user);
    set({ user, role, token, rolesList, isAuthenticated: true });
  },

  initialize: () => {
    const token = sessionStorage.getItem('x-auth-token');
    const user = sessionStorage.getItem('UserName');
    const role = sessionStorage.getItem('Role');
    const rolesRaw = sessionStorage.getItem('RolesList');
    const rolesList = rolesRaw ? JSON.parse(rolesRaw) : [];

    if (token && user) {
      set({ user, role, token, rolesList, isAuthenticated: true });
    }
  },

  logout: () => {
    sessionStorage.clear();
    set({
      user: null,
      role: null,
      token: null,
      rolesList: [],
      isAuthenticated: false,
    });
  },

  initialize: () => {
    const token = sessionStorage.getItem('x-auth-token');
    const user = sessionStorage.getItem('UserName');
    const role = sessionStorage.getItem('Role');
    if (token && user) {
      set({ user, role, token, isAuthenticated: true });
    }
  },
})));