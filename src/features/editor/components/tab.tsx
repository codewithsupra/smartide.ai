"use client";

import { useEffect } from "react";
import { FileIcon } from "@react-symbols/icons/utils";
import { Loader2Icon, XIcon } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useFile } from "@/hooks/use-files";
import { cn } from "@/lib/utils";
import { useEditor } from "../hooks/use-editor";

export const Tab = ({ fileId, projectId, isFirst }: {
  fileId: Id<"files">;
  projectId: Id<"projects">;
  isFirst: boolean;
}) => {
  const file = useFile(fileId);
  const { tabState, setActiveTab, openFile, closeTab } = useEditor(projectId);
  const isActive = tabState.activeTab === fileId;
  const isPreview = tabState.previewTab === fileId;

  useEffect(() => {
    if (file === null) closeTab(fileId);
  }, [file, fileId, closeTab]);

  if (file === null) return null;

  return (
    <div className={cn(
      "group/tab relative flex h-full shrink-0 items-center border-r text-xs",
      isFirst && "border-l",
      isActive ? "bg-background text-foreground after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:bg-ring" : "text-muted-foreground hover:bg-accent/40",
    )}>
      <button
        type="button"
        aria-pressed={isActive}
        onClick={() => setActiveTab(fileId)}
        onDoubleClick={() => openFile(fileId)}
        className="flex h-full min-w-0 items-center gap-2 pl-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        title={file?.name ?? "Loading file…"}
      >
        {file ? (
          <FileIcon fileName={file.name} autoAssign aria-hidden="true" className="size-4 shrink-0" />
        ) : (
          <Loader2Icon aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />
        )}
        <span className={cn("max-w-40 truncate", isPreview && "italic")}>{file?.name ?? "Loading…"}</span>
      </button>
      <button
        type="button"
        aria-label={`Close ${file?.name ?? "file"}`}
        title="Close tab"
        onClick={() => closeTab(fileId)}
        className={cn(
          "mr-1 flex size-5 shrink-0 items-center justify-center rounded-sm hover:bg-accent focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !isActive && "md:opacity-0 md:group-hover/tab:opacity-100 md:group-focus-within/tab:opacity-100",
        )}
      >
        <XIcon aria-hidden="true" className="size-3" />
      </button>
    </div>
  );
};
