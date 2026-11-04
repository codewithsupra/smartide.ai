"use client";

import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { ConvexError } from "convex/values";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useUpdateFile } from "@/hooks/use-files";

type Edit = { fileId: Id<"files">; content: string };

export const useAutosave = (fileId: Id<"files"> | null) => {
  const updateFile = useUpdateFile();
  const latestEdit = useRef<Edit | null>(null);
  const [error, setError] = useState<{ fileId: Id<"files">; message: string } | null>(null);

  // Wait until typing stops for 500 ms, then save the latest edit.
  const save = useDebouncedCallback(async (edit: Edit) => {
    try {
      await updateFile(edit);
    } catch (error) {
      if (latestEdit.current !== edit) return;
      setError({
        fileId: edit.fileId,
        message: error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : "Could not save changes. Please try again.",
      });
    }
  }, 500);

  // Save pending text immediately when switching files or leaving the editor.
  useEffect(() => {
    return () => { void save.flush(); };
  }, [fileId, save]);

  const handleChange = (content: string) => {
    if (!fileId) return;
    const edit = { fileId, content };
    latestEdit.current = edit;
    setError(null);
    void save(edit);
  };

  return {
    handleChange,
    saveError: error?.fileId === fileId ? error.message : null,
  };
};
