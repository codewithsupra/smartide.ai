"use client";

import { cn } from "@/lib/utils";
import { Code2Icon, MonitorIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { FaGithub } from "react-icons/fa";
import { Allotment } from "allotment";
import { FileExplorer } from "./file-explorer/index"
import EditorView from "@/features/editor/components/editor-view";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_SIDEBAR_WIDTH = 300;
const DEFAULT_MAIN_SIZE = 1000;

const Tab = ({ label, icon, active, onClick }: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick?: () => void;
}) => {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "relative flex h-full shrink-0 items-center gap-2 border-r px-4 text-xs font-medium transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        active
          ? "bg-background text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-t-full after:bg-ring"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};
export const ProjectIdView = ({ projectId }: { projectId: string }) => {
  const [activeView, setActiveView] = useState<"editor" | "preview">("editor");

  return (
    <div id={`project-${projectId}`} className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background">
      <nav aria-label="Project views" className="flex h-10 shrink-0 items-center border-b bg-sidebar">
        <Tab
          label="Code"
          icon={<Code2Icon aria-hidden="true" className="size-3.5" />}
          active={activeView === "editor"}
          onClick={() => setActiveView("editor")}
        />
        <Tab
          label="Preview"
          icon={<MonitorIcon aria-hidden="true" className="size-3.5" />}
          active={activeView === "preview"}
          onClick={() => setActiveView("preview")}
        />
        <button
          type="button"
          disabled
          title="GitHub export is coming soon"
          className="mx-2 ml-auto inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium text-muted-foreground opacity-50 disabled:cursor-not-allowed"
        >
          <FaGithub aria-hidden="true" className="size-3.5" />
          <span className="hidden sm:inline">Export</span>
          <span className="sr-only sm:hidden">Export to GitHub</span>
        </button>
      </nav>
      <div className="relative min-h-0 flex-1 overflow-auto">
        <section hidden={activeView !== "editor"} aria-label="Code editor" className="h-full min-h-64">
          <Allotment defaultSizes={[DEFAULT_SIDEBAR_WIDTH, DEFAULT_MAIN_SIZE]}>
            <Allotment.Pane
              snap
              minSize={MIN_SIDEBAR_WIDTH}
              maxSize={MAX_SIDEBAR_WIDTH}
              preferredSize={DEFAULT_SIDEBAR_WIDTH}
            >
              <FileExplorer  projectId={projectId} />
            </Allotment.Pane>
            <Allotment.Pane>
              <EditorView projectId={projectId} />
            </Allotment.Pane>
          </Allotment>
        </section>
        <section hidden={activeView !== "preview"} aria-label="Project preview" className="h-full min-h-64 p-3 sm:p-5">
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-sidebar/40 p-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl border bg-background text-muted-foreground">
              <MonitorIcon aria-hidden="true" className="size-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-medium">Project preview</h2>
              <p className="max-w-64 text-xs leading-relaxed text-muted-foreground">Your running app will appear here.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
