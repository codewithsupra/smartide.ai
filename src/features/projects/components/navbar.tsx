import Link from "next/link";
import { useState } from "react";
import { CheckIcon, PencilIcon, XIcon } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { useProject ,useRenameProject } from "@/features/projects/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Doc } from "../../../../convex/_generated/dataModel";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { PolarisLogo } from "./polaris-logo";
import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";

const font=Poppins({subsets:["latin"],weight:["400","500","600","700"]});

function EditableProjectName({ project }: { project: Doc<"projects"> }) {
  const renameProject = useRenameProject();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAgo, setSavedAgo] = useState("");

  const cancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const save = async () => {
    if (isSaving) return;
    const newName = name.trim();
    if (!newName) {
      setError("Enter a project name.");
      return;
    }
    if (newName === project.name) {
      cancel();
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await renameProject({ id: project._id, name: newName });
      toast.add({ title: "Saved", type: "success" });
      setIsEditing(false);
    } catch {
      setError("Couldn't rename the project. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative min-w-0">
      {isEditing ? (
        <form className="flex items-center gap-1" onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}>
          <Input
            autoFocus
            aria-label="Project name"
            aria-invalid={!!error}
            className="h-7 w-28 text-sm sm:w-48"
            value={name}
            disabled={isSaving}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !isSaving) {
                event.preventDefault();
                cancel();
              }
            }}
          />
          <Button type="submit" variant="ghost" size="icon-xs" disabled={isSaving} aria-label="Save project name" title="Save (Enter)">
            {isSaving ? <Spinner className="size-3.5" /> : <CheckIcon className="size-3.5" />}
          </Button>
          <Button type="button" variant="ghost" size="icon-xs" disabled={isSaving} onClick={cancel} aria-label="Cancel renaming" title="Cancel (Escape)">
            <XIcon className="size-3.5" />
          </Button>
        </form>
      ) : (
        <TooltipProvider delay={300}>
          <Tooltip onOpenChange={(open) => {
            if (open) {
              setSavedAgo(formatDistanceToNow(project.updatedAt ?? project._creationTime, { addSuffix: true }));
            }
          }}>
        <TooltipTrigger render={<button
          type="button"
          className="group flex max-w-48 items-center gap-1.5 rounded-sm text-sm text-foreground transition-colors hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Rename project: ${project.name}`}
          onClick={() => {
            setName(project.name);
            setError(null);
            setIsEditing(true);
          }}
        />}>
          <span className="truncate">{project.name}</span>
          <PencilIcon className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
        </TooltipTrigger>
            <TooltipContent side="bottom" align="start">Saved {savedAgo}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {error && <p role="alert" className="absolute top-full left-0 z-10 mt-2 w-56 rounded-md border bg-popover p-2 text-xs text-destructive shadow-md">{error}</p>}
    </div>
  );
}

export const Navbar = ({ projectId }: { projectId: string }) => {
  const project = useProject(projectId);
  const projectName = project === undefined ? "Loading project…" : project?.name ?? "Project not found";
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-sidebar px-4 text-sidebar-foreground">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              render={<Link href="/" />}
              className="flex items-center gap-1.5 rounded-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PolarisLogo className="size-6 shrink-0" />
              <span className={cn("text-sm font-medium", font.className)}>Polaris</span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            {project ? (
              <EditableProjectName key={project._id} project={project} />
            ) : (
              <BreadcrumbPage className="max-w-48 truncate" title={projectName}>
                {projectName}
              </BreadcrumbPage>
            )}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex shrink-0 items-center">
        <UserButton />
      </div>
    </header>
  );
};
