"use client";

import { useId, useState } from "react";
import { ChevronRightIcon, FilePlusIcon, FolderPlusIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { ConvexError } from "convex/values";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { useCreateFile, useCreateFolder, useDeleteFile, useFolderContents, useRenameFile } from "@/hooks/use-files";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { CreateInput } from "./create-input";
import { getItemPadding } from "./constants";
import { LoadingRow } from "./loading-row";
import { ItemIcon } from "./item-icon";

type TreeProps = {
  item: Doc<"files">;
  level: number;
  projectId: string;
};

export const Tree = ({ item, level, projectId }: TreeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const contentsId = useId();
  const [creating, setCreating] = useState<"file" | "folder" | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createFile = useCreateFile({ projectId, parentId: item._id });
  const createFolder = useCreateFolder({ projectId, parentId: item._id });
  const renameFile = useRenameFile();
  const deleteFile = useDeleteFile();
  const isFolder = item.type === "folder";

  const startCreating = (type: "file" | "folder") => {
    setError(null);
    setRenaming(false);
    setIsOpen(true);
    setCreating(type);
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteFile({ fileId: item._id });
    } catch (error) {
      setError(error instanceof ConvexError && typeof error.data === "string"
        ? error.data : "Could not delete this item. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {renaming ? (
        <CreateInput
          mode="rename"
          initialName={item.name}
          type={item.type}
          level={level}
          onSubmit={async (name) => {
            await renameFile({ fileId: item._id, name });
            setRenaming(false);
          }}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <div className="group/item flex h-7 min-w-0 items-center pr-1 text-xs text-sidebar-foreground hover:bg-sidebar-accent">
          {isFolder ? (
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={isOpen ? contentsId : undefined}
              onClick={() => setIsOpen((open) => !open)}
              className="flex h-full min-w-0 flex-1 items-center gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              style={{ paddingLeft: getItemPadding(level, false) }}
              title={item.name}
            >
              <ChevronRightIcon aria-hidden="true" className={`size-3.5 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              <ItemIcon name={item.name} type={item.type} />
              <span className="truncate">{item.name}</span>
            </button>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-1.5" style={{ paddingLeft: getItemPadding(level, true) }} title={item.name}>
              <ItemIcon name={item.name} type={item.type} />
              <span className="truncate">{item.name}</span>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-xs" />}
              aria-label={`Actions for ${item.name}`}
              disabled={isDeleting}
              className="ml-1 shrink-0 text-muted-foreground md:opacity-0 md:group-hover/item:opacity-100 md:group-focus-within/item:opacity-100 data-popup-open:opacity-100"
            >
              <MoreHorizontalIcon aria-hidden="true" className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isFolder && (
                <>
                  <DropdownMenuItem onClick={() => startCreating("file")}><FilePlusIcon />New file</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => startCreating("folder")}><FolderPlusIcon />New folder</DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => {
                setCreating(null);
                setError(null);
                setRenaming(true);
              }}><PencilIcon />Rename</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={handleDelete}><Trash2Icon />{isFolder ? "Delete " : "Delete file"}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {error && <p role="alert" className="px-3 py-1 text-xs text-destructive">{error}</p>}
      {isFolder && isOpen && (
        <div id={contentsId}>
          {creating && (
            <CreateInput
              key={creating}
              type={creating}
              level={level + 1}
              onSubmit={async (name) => {
                if (creating === "file") await createFile({ name });
                else await createFolder({ name });
                setCreating(null);
              }}
              onCancel={() => setCreating(null)}
            />
          )}
          <FolderContents item={item} level={level + 1} projectId={projectId} />
        </div>
      )}
    </div>
  );
};

const FolderContents = ({ item, level, projectId }: TreeProps) => {
  const { results, status, loadMore } = useFolderContents({ projectId, parentId: item._id });

  return (
    <>
      {status === "LoadingFirstPage" && <LoadingRow level={level} />}
      {results.map((child) => (
        <Tree key={child._id} item={child} level={level} projectId={projectId} />
      ))}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <div style={{ paddingLeft: getItemPadding(level, false) }}>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            disabled={status === "LoadingMore"}
            onClick={() => loadMore(50)}
          >
            {status === "LoadingMore" ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </>
  );
};
