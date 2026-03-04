import { create } from 'zustand';
import { Report, ReportStatus, ReportType } from '@/lib/types';
import { reportsApi } from '@/lib/api';
import { subscribeReportStatus } from '@/lib/sse';

interface GeneratingReport {
  progress: number;
  message: string;
  status: ReportStatus;
}

interface ReportState {
  reports: Report[];
  loading: boolean;
  error: string | null;
  generating: Map<string, GeneratingReport>;
  modalOpen: boolean;

  fetchReports: () => Promise<void>;
  generateReport: (
    reportType: ReportType,
    title: string,
    documentIds?: string[],
    prompt?: string,
  ) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  retryReport: (report: Report) => Promise<void>;
  setModalOpen: (open: boolean) => void;
  clearError: () => void;
}

const sseCleanups = new Map<string, () => void>();

// SSE가 일정 시간 내 완료/실패 이벤트를 안 보내면 타임아웃 처리
const SSE_TIMEOUT_MS = 180_000; // 3분
const sseTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function clearSseTimeout(reportId: string) {
  const t = sseTimeouts.get(reportId);
  if (t) {
    clearTimeout(t);
    sseTimeouts.delete(reportId);
  }
}

export const useReportStore = create<ReportState>((set, get) => ({
  reports: [],
  loading: false,
  error: null,
  generating: new Map(),
  modalOpen: false,

  fetchReports: async () => {
    set({ loading: true, error: null });
    try {
      const reports = await reportsApi.list();
      set({ reports, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  generateReport: async (reportType, title, documentIds, prompt) => {
    try {
      const res = await reportsApi.generate({
        reportType,
        title,
        documentIds,
        prompt,
      });

      const reportId = res.reportId;

      // Add to generating map
      set((state) => {
        const next = new Map(state.generating);
        next.set(reportId, {
          progress: 0,
          message: '리포트 생성 대기 중...',
          status: 'PENDING',
        });
        return { generating: next, modalOpen: false };
      });

      // 타임아웃 설정 — SSE가 끊기거나 이벤트가 안 오면 실패 처리
      sseTimeouts.set(
        reportId,
        setTimeout(() => {
          const gen = get().generating.get(reportId);
          if (gen && gen.status !== 'COMPLETED' && gen.status !== 'FAILED') {
            set((state) => {
              const next = new Map(state.generating);
              next.set(reportId, {
                progress: 0,
                message: '응답 시간이 초과되었습니다',
                status: 'FAILED',
              });
              return { generating: next };
            });
            // SSE 정리
            sseCleanups.get(reportId)?.();
            sseCleanups.delete(reportId);
            // 서버 상태 새로고침
            get().fetchReports();
          }
        }, SSE_TIMEOUT_MS),
      );

      // Subscribe to SSE
      const cleanup = subscribeReportStatus(
        reportId,
        (event) => {
          // 이벤트 수신 시 타임아웃 리셋
          clearSseTimeout(reportId);
          if (event.status !== 'COMPLETED' && event.status !== 'FAILED') {
            sseTimeouts.set(
              reportId,
              setTimeout(() => {
                set((state) => {
                  const next = new Map(state.generating);
                  next.set(reportId, {
                    progress: 0,
                    message: '응답 시간이 초과되었습니다',
                    status: 'FAILED',
                  });
                  return { generating: next };
                });
                sseCleanups.get(reportId)?.();
                sseCleanups.delete(reportId);
                get().fetchReports();
              }, SSE_TIMEOUT_MS),
            );
          }

          set((state) => {
            const next = new Map(state.generating);
            next.set(reportId, {
              progress: event.progress,
              message: event.message,
              status: event.status,
            });
            return { generating: next };
          });

          if (event.status === 'COMPLETED' || event.status === 'FAILED') {
            clearSseTimeout(reportId);
            sseCleanups.delete(reportId);
            get().fetchReports();

            // COMPLETED는 3초 후 제거, FAILED는 유지 (사용자가 확인할 때까지)
            if (event.status === 'COMPLETED') {
              setTimeout(() => {
                set((state) => {
                  const next = new Map(state.generating);
                  next.delete(reportId);
                  return { generating: next };
                });
              }, 3000);
            }
          }
        },
        (errorMsg) => {
          clearSseTimeout(reportId);
          set((state) => {
            const next = new Map(state.generating);
            next.set(reportId, {
              progress: 0,
              message: errorMsg,
              status: 'FAILED',
            });
            return { generating: next };
          });
          get().fetchReports();
        },
      );

      sseCleanups.set(reportId, cleanup);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  deleteReport: async (id) => {
    try {
      await reportsApi.delete(id);
      // generating map에서도 제거
      set((state) => {
        const nextGen = new Map(state.generating);
        nextGen.delete(id);
        return {
          reports: state.reports.filter((r) => r.id !== id),
          generating: nextGen,
        };
      });
      // SSE 정리
      sseCleanups.get(id)?.();
      sseCleanups.delete(id);
      clearSseTimeout(id);
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  retryReport: async (report) => {
    // 기존 실패 리포트 삭제 후 같은 설정으로 재생성
    try {
      await reportsApi.delete(report.id);
      set((state) => ({
        reports: state.reports.filter((r) => r.id !== report.id),
      }));
    } catch {
      // 삭제 실패해도 재생성 진행
    }

    await get().generateReport(
      report.reportType,
      report.title,
    );
  },

  setModalOpen: (open) => set({ modalOpen: open }),

  clearError: () => set({ error: null }),
}));
