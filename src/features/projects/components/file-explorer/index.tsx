"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRightIcon, FilePlusIcon, FolderPlusIcon, ListCollapseIcon } from "lucide-react";
import { useState } from "react";
import { useProject } from "../../hooks/use-projects";
import { Button } from "@/components/ui/button";
import { useCreateFile, useCreateFolder, useFolderContents } from "@/hooks/use-files";
import { CreateInput } from "./create-input";
import { LoadingRow } from "./loading-row";
import { Tree } from "./tree";
import { useEditor } from "@/features/editor/hooks/use-editor";
import type { Id } from "../../../../../convex/_generated/dataModel";

export const FileExplorer = ({ projectId }: { projectId: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);

  const createFile = useCreateFile({ projectId, parentId: undefined });
  const createFolder = useCreateFolder({ projectId, parentId: undefined });
  const rootFiles = useFolderContents({ projectId, parentId: undefined });
  const { openFile } = useEditor(projectId as Id<"projects">);

  const project = useProject(projectId);


  const handleCreate = async (name: string) => {
    if (creating === "file") {
      const fileId = await createFile({ name });
      openFile(fileId);
    } else if (creating === "folder") {
      await createFolder({ name });
    } else {
      return;
    }
    setCreating(null);
  };

  return (
    <div className="h-full bg-sidebar">
      <ScrollArea className="h-full">
        <div className="group/project flex h-8 w-full items-center gap-1 border-b border-sidebar-border bg-accent/50 px-1.5">
          <button
            type="button"
            aria-expanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            className="flex h-6 min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-sm text-left font-semibold text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronRightIcon
              aria-hidden="true"
              className={`size-3.5 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
            />
            <span className="truncate text-xs uppercase tracking-wide">
              {project === undefined ? "Loading…" : project?.name ?? "Project not found"}
            </span>
          </button>
          <div
            role="group"
            aria-label="File explorer actions"
            className="ml-auto flex shrink-0 items-center gap-0.5 transition-opacity md:opacity-0 md:group-hover/project:opacity-100 md:group-focus-within/project:opacity-100"
          >
            <Button
              type="button"
              aria-label="New file"
              title="New file"
              variant="ghost"
              size="icon-xs"
              className="rounded-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              disabled={!project}
              onClick={() => {
                setIsOpen(true);
                setCreating("file");
              }}
            >
              <FilePlusIcon aria-hidden="true" className="size-3.5" />
            </Button>
            <Button
              type="button"
              aria-label="New folder"
              title="New folder"
              variant="ghost"
              size="icon-xs"
              className="rounded-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              disabled={!project}
              onClick={() => {
                setIsOpen(true);
                setCreating("folder");
              }}
            >
              <FolderPlusIcon aria-hidden="true" className="size-3.5" />
            </Button>
            <Button
              type="button"
              aria-label="Collapse all folders"
              title="Collapse all folders"
              variant="ghost"
              size="icon-xs"
              className="rounded-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={() => {
                setCreating(null);
                setIsOpen(false);
              }}
            >
              <ListCollapseIcon aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        </div>
        {isOpen && (
          <>
            {rootFiles.status === "LoadingFirstPage" && <LoadingRow level={0} />}
            {creating && (
              <CreateInput
                key={creating}
                type={creating}
                level={0}
                onSubmit={handleCreate}
                onCancel={() => setCreating(null)}
              />
            )}
            {rootFiles.results.map((item) => (
              <Tree
                key={item._id}
                item={item}
                level={0}
                projectId={projectId}
              />
            ))}
            {(rootFiles.status === "CanLoadMore" || rootFiles.status === "LoadingMore") && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="ml-3 my-1"
                disabled={rootFiles.status === "LoadingMore"}
                onClick={() => rootFiles.loadMore(50)}
              >
                {rootFiles.status === "LoadingMore" ? "Loading…" : "Load more"}
              </Button>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  );
};
