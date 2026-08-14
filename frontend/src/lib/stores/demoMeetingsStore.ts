import { create } from 'zustand';

interface DemoMeetingsState {
  search: string;
  sort: string;
  showCreate: boolean;
  deleteConfirm: number | null;
  setSearch: (search: string) => void;
  setSort: (sort: string) => void;
  setShowCreate: (show: boolean) => void;
  setDeleteConfirm: (id: number | null) => void;
}

export const useDemoMeetingsStore = create<DemoMeetingsState>((set) => ({
  search: '',
  sort: 'date_desc',
  showCreate: false,
  deleteConfirm: null,

  setSearch: (search) => set({ search }),
  setSort: (sort) => set({ sort }),
  setShowCreate: (showCreate) => set({ showCreate }),
  setDeleteConfirm: (deleteConfirm) => set({ deleteConfirm }),
}));
