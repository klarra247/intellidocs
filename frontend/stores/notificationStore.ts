import { create } from 'zustand';
import { notificationsApi } from '@/lib/api';
import type { Notification } from '@/lib/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  totalCount: number;
  page: number;

  fetchNotifications: (page?: number, size?: number, isRead?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  startPolling: () => void;
  stopPolling: () => void;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

function handleVisibilityChange() {
  const store = useNotificationStore.getState();
  if (document.hidden) {
    store.stopPolling();
  } else {
    store.fetchUnreadCount();
    store.startPolling();
  }
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  totalCount: 0,
  page: 0,

  fetchNotifications: async (page = 0, size = 20, isRead?: boolean) => {
    set({ loading: true });
    try {
      const res = await notificationsApi.list(page, size, isRead);
      set({
        notifications: res.notifications,
        unreadCount: res.unreadCount,
        totalCount: res.totalCount,
        page,
      });
    } catch {
      // silent — polling resilience
    } finally {
      set({ loading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await notificationsApi.unreadCount();
      set({ unreadCount: res.count });
    } catch {
      // silent
    }
  },

  markAsRead: async (id: string) => {
    const target = get().notifications.find((n) => n.id === id);
    if (!target || target.isRead) return;

    // Optimistic update
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }));

    try {
      await notificationsApi.markAsRead(id);
    } catch {
      // Revert on failure
      set((s) => ({
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, isRead: false } : n
        ),
        unreadCount: s.unreadCount + 1,
      }));
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllAsRead();
      set({
        notifications: get().notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      });
    } catch {
      // silent
    }
  },

  deleteNotification: async (id: string) => {
    try {
      await notificationsApi.delete(id);
      set((s) => {
        const target = s.notifications.find((n) => n.id === id);
        return {
          notifications: s.notifications.filter((n) => n.id !== id),
          unreadCount: target && !target.isRead ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
          totalCount: Math.max(0, s.totalCount - 1),
        };
      });
    } catch {
      // silent
    }
  },

  startPolling: () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      get().fetchUnreadCount();
    }, 30_000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  },

  stopPolling: () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  },
}));
