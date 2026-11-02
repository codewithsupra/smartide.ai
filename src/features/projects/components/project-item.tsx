import { AlertCircleIcon, ChevronRightIcon, GlobeIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Doc } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { FaGithub } from "react-icons/fa";
interface ProjectItemProps {
  project: Doc<"projects">;
  onDelete?: () => void;
  deleteDisabled?: boolean;
}
export const formatTimeStamp = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

const getProjectIcon=(project:Doc<"projects">)=>{
    if(project.importStatus==="completed"){
      return <FaGithub className="size-4 text-muted-foreground" aria-hidden="true" />
    }
    if (project.importStatus==='importing'){
      return <Loader2Icon className="size-4 text-muted-foreground animate-spin" aria-hidden="true" />
    }
    if(project.importStatus==='failed'){
      return <AlertCircleIcon className="size-4 text-muted-foreground" aria-hidden="true" />
    }
    return <GlobeIcon className="size-4 text-muted-foreground" aria-hidden="true" />

}
export const ProjectItem = ({ project, onDelete, deleteDisabled }: ProjectItemProps) => {
  return (
    <li className="relative min-w-0">
      <Link
        href={`/projects/${project._id}`}
        className={`group flex w-full items-center gap-3 rounded-lg border border-border/60 bg-background p-3 transition-colors hover:border-border hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar ${onDelete ? "pr-12" : ""}`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-accent/40 text-muted-foreground transition-colors group-hover:text-foreground">
          {getProjectIcon(project)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-foreground" title={project.name}>
            {project.name}
          </span>
          <time
            dateTime={new Date(project._creationTime).toISOString()}
            className="text-xs text-muted-foreground"
          >
            {formatTimeStamp(project._creationTime)}
          </time>
        </span>
        {!onDelete && <ChevronRightIcon
          className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground"
          aria-hidden="true"
        />}
      </Link>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Delete ${project.name}`}
          title="Delete project"
          disabled={deleteDisabled}
          onClick={onDelete}
        >
          <Trash2Icon className="size-4" aria-hidden="true" />
        </Button>
      )}
    </li>
  );
};
