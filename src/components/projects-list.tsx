"use client";

import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "./ui/button";
import { AuthLoadingView } from "@/features/auth/components/auth-loading-view";
import { UnauthenticatedView } from "@/features/auth/components/unauthenticated";

function ProjectsContent() {
  const projects = useQuery(api.projects.get);
  const createProject = useMutation(api.projects.create);

  return (
    <div className="mx-auto flex w-full  max-w-2xl flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Projects</h2>
        <Button onClick={() => createProject({ name: "New Project" })}>
          Add new project
        </Button>
      </div>

      {projects?.length === 0 && (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      )}

      {projects?.map((project) => (
        <div key={project._id} className="flex flex-col gap-1 rounded-lg border bg-card p-4 text-card-foreground">
          <h3 className="text-lg font-semibold">{project.name}</h3>
          <p className="text-sm text-muted-foreground">
            Owner ID: {project.ownerId}
          </p>
          <p className="text-sm text-muted-foreground">
            Import Status: {project.importStatus ?? "N/A"}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ProjectsList() {
  return (
    <>
      <AuthLoading>
        <AuthLoadingView />
      </AuthLoading>
      <Unauthenticated>
        <UnauthenticatedView />
      </Unauthenticated>
      <Authenticated>
        <ProjectsContent />
      </Authenticated>
    </>
  );
}
