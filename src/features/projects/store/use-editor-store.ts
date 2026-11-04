import { create } from "zustand";
import type { Id } from "../../../../convex/_generated/dataModel";

interface TabState{
    openTabs:Id<"files">[];
    activeTab: Id<"files"> | null;
    previewTab: Id<"files"> | null;
}

const defaultTabState: TabState = {
    openTabs: [],
    activeTab: null,
    previewTab: null,
};

interface EditorStore {
    tabs:Map<Id<"projects">,TabState>;
    getTabState: (projectId: Id<"projects">) => TabState;
    openFile: (projectId: Id<"projects">, fileId: Id<"files">, options?: { preview?: boolean }) => void;
    closeTab: (projectId: Id<"projects">, fileId: Id<"files">) => void;
    closeAllTabs: (projectId: Id<"projects">) => void;
    setActiveTab: (projectId: Id<"projects">, fileId: Id<"files"> | null) => void;
}

export const useEditorStore = create<EditorStore>()((set, get) => ({
  tabs: new Map(),
  getTabState: (projectId) => get().tabs.get(projectId) ?? defaultTabState,
  openFile: (projectId, fileId, options) => {
    set((state) => {
      const current = state.tabs.get(projectId) ?? defaultTabState;
      const openTabs = [...current.openTabs];
      let previewTab = current.previewTab;

      if (openTabs.includes(fileId)) {
        // Opening the preview normally pins it; pinned tabs stay pinned.
        if (!options?.preview && previewTab === fileId) previewTab = null;
      } else if (options?.preview) {
        const previewIndex = previewTab === null ? -1 : openTabs.indexOf(previewTab);
        if (previewIndex >= 0) openTabs[previewIndex] = fileId;
        else openTabs.push(fileId);
        previewTab = fileId;
      } else {
        openTabs.push(fileId);
      }

      const tabs = new Map(state.tabs);
      tabs.set(projectId, { openTabs, activeTab: fileId, previewTab });
      return { tabs };
    });
  },
  closeTab: (projectId, fileId) => {
    set((state) => {
      const current = state.tabs.get(projectId);
      if (!current) return state;
      const index = current.openTabs.indexOf(fileId);
      if (index < 0) return state;

      const openTabs = current.openTabs.filter((id) => id !== fileId);
      const activeTab = current.activeTab === fileId
        ? openTabs[index] ?? openTabs[index - 1] ?? null
        : current.activeTab;
      const tabs = new Map(state.tabs);
      tabs.set(projectId, {
        openTabs,
        activeTab,
        previewTab: current.previewTab === fileId ? null : current.previewTab,
      });
      return { tabs };
    });
  },
  closeAllTabs: (projectId) => {
    set((state) => {
      if (!state.tabs.has(projectId)) return state;
      const tabs = new Map(state.tabs);
      tabs.delete(projectId);
      return { tabs };
    });
  },
  setActiveTab: (projectId, fileId) => {
    set((state) => {
      const current = state.tabs.get(projectId);
      if (!current || current.activeTab === fileId) return state;
      if (fileId !== null && !current.openTabs.includes(fileId)) return state;

      const tabs = new Map(state.tabs);
      tabs.set(projectId, { ...current, activeTab: fileId });
      return { tabs };
    });
  },
}));

