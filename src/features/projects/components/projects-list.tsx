"use client";

import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useProjectsPartial } from "../hooks/use-projects";
import { ProjectItem, formatTimeStamp } from "./project-item";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { ArrowRightIcon, GlobeIcon } from "lucide-react";

interface ProjectListProps {
  onViewAll: () => void;
}

const ContinueCard = ({ data }: { data: Doc<"projects"> }) => (
  <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
    <div className="flex flex-col gap-4 p-4">
      <span className="text-xs font-medium text-muted-foreground">Continue Project</span>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-ring/20 bg-ring/10 text-ring">
          <GlobeIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-semibold text-foreground" title={data.name}>
            {data.name}
          </span>
          <time
            dateTime={new Date(data._creationTime).toISOString()}
            className="text-xs text-muted-foreground"
          >
            {formatTimeStamp(data._creationTime)}
          </time>
        </div>
      </div>
    </div>
    <div className="border-t border-border/60 bg-muted/20 px-4 py-3">
    <Button
      className="group/continue h-9 w-full justify-between px-3"
      render={<Link href={`/projects/${data._id}`} />}
    >
      Continue
      <ArrowRightIcon
        className="size-4 transition-transform group-hover/continue:translate-x-0.5 motion-reduce:transform-none"
        aria-hidden="true"
      />
    </Button>
    </div>
  </div>
);

export const ProjectsList = ({ onViewAll }: ProjectListProps) => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const projects = useProjectsPartial(5);

  if (!isLoading && !isAuthenticated) {
    return <p className="text-sm text-muted-foreground">Sign in to view your projects.</p>;
  }

  if (isLoading || projects === undefined) {
    return (
      <div role="status" className="flex justify-center py-4">
        <Spinner className="size-6 text-ring" />
        <span className="sr-only">Loading projects</span>
      </div>
    );
  }

  const [mostRecent, ...restProjects] = projects;
  if (!mostRecent) {
    return <p className="text-sm text-muted-foreground">No projects yet. Create one to get started.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <ContinueCard data={mostRecent} />
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs text-muted-foreground">Recent Projects</h2>
        <Button
          variant="link"
          size="sm"
          className="flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={onViewAll}
        >
          View All
          <Kbd className="border bg-accent">&#8984;K</Kbd>
        </Button>
      </div>
      {restProjects.length > 0 && (
        <ul className="flex flex-col gap-2">
          {restProjects.map((project) => (
            <ProjectItem key={project._id} project={project} />
          ))}
        </ul>
      )}
    </div>
  );
};
