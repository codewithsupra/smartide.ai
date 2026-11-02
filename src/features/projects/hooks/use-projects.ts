"use client";

import { insertAtTop, useConvexAuth, usePaginatedQuery, useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

function createTemporaryProject(name: string, ownerId: string) {
  const now = Date.now();
  return {
    _id: crypto.randomUUID() as Id<"projects">,
    name,
    ownerId,
    _creationTime: now,
    updatedAt: now,
  };
}

export const useProjects = (initialNumItems = 10) => {
  const { isAuthenticated } = useConvexAuth();
  return usePaginatedQuery(api.projects.get, isAuthenticated ? {} : "skip", { initialNumItems });
};

export const useProjectsPartial = (limit: number) => {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.projects.getPartial, isAuthenticated ? { limit } : "skip");
};

export const useDeleteProject = () => useMutation(api.projects.remove);

export const useDeleteAllProjects = () => useMutation(api.projects.removeAll);

export const useCreateProject = () => {
  const { userId } = useAuth();

  return useMutation(api.projects.create).withOptimisticUpdate((store, { name }) => {
    if (!userId) return;
    const project = createTemporaryProject(name, userId);

    // Update any loaded previews, keeping their requested size.
    for (const { args, value } of store.getAllQueries(api.projects.getPartial)) {
      if (value) {
        store.setQuery(api.projects.getPartial, args, [project, ...value].slice(0, args.limit));
      }
    }

    // Convex handles inserting into the first page of View All.
    insertAtTop({ paginatedQuery: api.projects.get, localQueryStore: store, item: project });
  });
};
