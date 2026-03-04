import { create } from 'zustand';
import {
  DiscrepancyResult,
  DiscrepancyStatus,
  DiscrepancyDetectRequest,
} from '@/lib/types';
import { discrepancyApi } from '@/lib/api';
import { subscribeDiscrepancyStatus } from '@/lib/sse';

interface ActiveJob {
  id: string;
  status: DiscrepancyStatus;
  message: string;
  progress: number;
}

interface DiscrepancyState {
  results: DiscrepancyResult[];
  loading: boolean;
  error: string | null;
  activeJob: ActiveJob | null;
  latestAutoResult: DiscrepancyResult | null;
  alertDismissed: boolean;
  detailResult: DiscrepancyResult | null;
  detailOpen: boolean;
  triggerModalOpen: boolean;

  fetchRecent: () => Promise<void>;
  fetchAutoLatest: () => Promise<void>;
  startDetection: (req: DiscrepancyDetectRequest) => Promise<void>;
  openDetail: (result: DiscrepancyResult) => void;
  closeDetail: () => void;
  dismissAlert: () => void;
  setTriggerModalOpen: (open: boolean) => void;
  clearError: () => void;
}

let sseCleanup: (() => void) | null = null;

export const useDiscrepancyStore = create<DiscrepancyState>((set, get) => ({
  results: [],
  loading: false,
  error: null,
  activeJob: null,
  latestAutoResult: null,
  alertDismissed: false,
  detailResult: null,
  detailOpen: false,
  triggerModalOpen: false,

  fetchRecent: async () => {
    set({ loading: true, error: null });
    try {
      const results = await discrepancyApi.getRecent();
      set({ results, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  fetchAutoLatest: async () => {
    try {
      const results = await discrepancyApi.getRecent('AUTO');
      const completed = results.find(
        (r) =>
          r.status === 'COMPLETED' &&
          r.resultData &&
          r.resultData.summary.discrepanciesFound > 0,
      );
      set({ latestAutoResult: completed ?? null, alertDismissed: false });
    } catch {
      // silently fail — alert banner is non-critical
    }
  },

  startDetection: async (req) => {
    // Cleanup previous SSE
    sseCleanup?.();
    sseCleanup = null;

    try {
      const res = await discrepancyApi.detect(req);
      const jobId = res.jobId;

      set({
        activeJob: {
          id: jobId,
          status: 'PENDING',
          message: '불일치 탐지 대기 중...',
          progress: 0,
        },
        error: null,
      });

      sseCleanup = subscribeDiscrepancyStatus(
        jobId,
        (event) => {
          set({
            activeJob: {
              id: jobId,
              status: event.status,
              message: event.message,
              progress: event.progress,
            },
          });

          if (event.status === 'COMPLETED' || event.status === 'FAILED') {
            sseCleanup = null;

            if (event.status === 'COMPLETED') {
              // Load the result and open detail panel
              discrepancyApi.getResult(jobId).then((result) => {
                set({
                  activeJob: null,
                  triggerModalOpen: false,
                  detailResult: result,
                  detailOpen: true,
                });
                get().fetchRecent();
              });
            } else {
              setTimeout(() => {
                set({ activeJob: null });
              }, 5000);
            }
          }
        },
        (errorMsg) => {
          set({
            activeJob: {
              id: jobId,
              status: 'FAILED',
              message: errorMsg,
              progress: 0,
            },
          });
          setTimeout(() => {
            set({ activeJob: null });
          }, 5000);
        },
      );
    } catch (e) {
      set({ error: (e as Error).message, activeJob: null });
    }
  },

  openDetail: (result) => set({ detailResult: result, detailOpen: true }),
  closeDetail: () => set({ detailOpen: false }),
  dismissAlert: () => set({ alertDismissed: true }),
  setTriggerModalOpen: (open) => set({ triggerModalOpen: open }),
  clearError: () => set({ error: null }),
}));
