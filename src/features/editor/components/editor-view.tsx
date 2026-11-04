"use client";

import CodeEditor from "./code-editor";
import { TopNavigation } from "./top-nav";
import { useEditor } from "../hooks/use-editor";
import type { Id } from "../../../../convex/_generated/dataModel";
import FileBreadCrumbs from "./file-breadcrumbs";
import { useFile } from "@/hooks/use-files";
import { useAutosave } from "../hooks/use-autosave";
import Image from "next/image";

function EditorView({ projectId }: { projectId: string }) {
  const { tabState } = useEditor(projectId as Id<"projects">);
  const activeTabId = tabState.activeTab;
  const activeFile = useFile(activeTabId);
  const { handleChange, saveError } = useAutosave(activeTabId);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex shrink-0 items-center">
        <TopNavigation project={projectId} />
      </div>
      {activeTabId && <FileBreadCrumbs projectId={projectId} />}
      {saveError && (
        <p role="alert" className="shrink-0 border-b px-3 py-2 text-xs text-destructive">
          {saveError}
        </p>
      )}
      <div className="min-h-0 flex-1 bg-background">
        {!activeFile && (
          <div className="flex size-full items-center justify-center">
            <Image className="opacity-25" src="/logo-alt.svg" alt="Logo" width={64} height={64} />
          </div>
        )}
        {activeFile && (
          <CodeEditor
            key={activeFile._id}
            fileName={activeFile.name}
            initialValue={activeFile.content ?? ""}
            onChange={handleChange}
          />
        )}
      </div>
    </div>
  );
}

export default EditorView;
