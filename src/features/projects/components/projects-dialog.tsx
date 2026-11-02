import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteAllProjects, useDeleteProject, useProjects } from "../hooks/use-projects";
import { ProjectItem } from "./project-item";
import type { Doc } from "../../../../convex/_generated/dataModel";

function AllProjects() {
  const { results, status, loadMore } = useProjects();
  const deleteProject = useDeleteProject();
  const deleteAllProjects = useDeleteAllProjects();
  const [deleteTarget, setDeleteTarget] = useState<Doc<"projects"> | "all" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      if (deleteTarget === "all") {
        let hasMore = true;
        while (hasMore) {
          ({ hasMore } = await deleteAllProjects({}));
        }
      } else {
        await deleteProject({ id: deleteTarget._id });
      }
      setDeleteTarget(null);
    } catch {
      setError(deleteTarget === "all"
        ? "Couldn't finish deleting all projects. Some may already be deleted. Try again to delete the rest."
        : "Couldn't delete this project. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const requestDelete = (target: Doc<"projects"> | "all") => {
    setError(null);
    setDeleteTarget(target);
  };

  return (
    <>
      {results.length > 0 && (
        <div className="flex justify-end">
          <Button variant="destructive" size="sm" disabled={isDeleting} onClick={() => requestDelete("all")}>
            <Trash2Icon className="size-4" aria-hidden="true" />
            Delete all
          </Button>
        </div>
      )}
      {status === "LoadingFirstPage" ? (
        <div role="status"><Spinner /><span className="sr-only">Loading projects</span></div>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto p-1">
          {results.map((project) => (
            <ProjectItem key={project._id} project={project} onDelete={() => requestDelete(project)} deleteDisabled={isDeleting} />
          ))}
        </ul>
      )}
      {(status === "CanLoadMore" || status === "LoadingMore") && (
        <Button variant="outline" disabled={status === "LoadingMore" || isDeleting} onClick={() => loadMore(10)}>
          {status === "LoadingMore" ? "Loading…" : "Load more"}
        </Button>
      )}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => {
        if (!open && !isDeleting) setDeleteTarget(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTarget === "all" ? "Delete all projects?" : "Delete project?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === "all"
                ? "Every project in your account will be permanently deleted, including projects not loaded here. This cannot be undone."
                : `“${deleteTarget?.name ?? "This project"}” will be permanently deleted. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={confirmDelete}>
              {isDeleting ? "Deleting…" : deleteTarget === "all" ? "Delete all projects" : "Delete project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ProjectsDialog({ open, onOpenChange }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your projects</DialogTitle>
          <DialogDescription>Browse all your projects, newest first.</DialogDescription>
        </DialogHeader>
        {open && <AllProjects />}
      </DialogContent>
    </Dialog>
  );
}
