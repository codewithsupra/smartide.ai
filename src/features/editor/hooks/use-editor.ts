"use client";

import { useCallback } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useEditorStore } from "../../projects/store/use-editor-store";

export const useEditor = (projectId: Id<"projects">) => {
  const store = useEditorStore();
  const tabState = store.getTabState(projectId);

  const openFile = useCallback(
    (fileId: Id<"files">, options?: { preview?: boolean }) => {
      store.openFile(projectId, fileId, options);
    },
    [store, projectId],
  );

  const closeTab = useCallback(
    (fileId: Id<"files">) => {
      store.closeTab(projectId, fileId);
    },
    [store, projectId],
  );

  const closeAllTabs = useCallback(() => {
    store.closeAllTabs(projectId);
  }, [store, projectId]);

  const setActiveTab = useCallback(
    (fileId: Id<"files"> | null) => {
      store.setActiveTab(projectId, fileId);
    },
    [store, projectId],
  );

  return {
    tabState,
    openFile,
    closeTab,
    closeAllTabs,
    setActiveTab,
  };
};
