"use client";

import { useCallback } from "react";
import { useConvexAuth, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type FolderLocation = {
  projectId: string;
  parentId?: string;
};

export const useFiles = (projectId: string, initialNumItems = 50) => {
  const { isAuthenticated } = useConvexAuth();
  return usePaginatedQuery(
    api.files.getFiles,
    isAuthenticated ? { projectId: projectId as Id<"projects"> } : "skip",
    { initialNumItems },
  );
};

export const useFile = (fileId: string | null | undefined) => {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.files.getFile,
    isAuthenticated && fileId ? { fileId: fileId as Id<"files"> } : "skip",
  );
};

export const useFolderContents = (
  { projectId, parentId }: FolderLocation,
  initialNumItems = 50,
) => {
  const { isAuthenticated } = useConvexAuth();
  return usePaginatedQuery(
    api.files.getFolderContents,
    isAuthenticated
      ? {
          projectId: projectId as Id<"projects">,
          parentId: parentId as Id<"files"> | undefined,
        }
      : "skip",
    { initialNumItems },
  );
};

export const useCreateFile = ({ projectId, parentId }: FolderLocation) => {
  const createFile = useMutation(api.files.createFile);
  return useCallback(
    ({ name, content }: { name: string; content?: string }) =>
      createFile({
        projectId: projectId as Id<"projects">,
        parentId: parentId as Id<"files"> | undefined,
        name,
        type: "file",
        content,
      }),
    [createFile, projectId, parentId],
  );
};

export const useCreateFolder = ({ projectId, parentId }: FolderLocation) => {
  const createFolder = useMutation(api.files.createFolder);
  return useCallback(
    ({ name }: { name: string }) =>
      createFolder({
        projectId: projectId as Id<"projects">,
        parentId: parentId as Id<"files"> | undefined,
        name,
      }),
    [createFolder, projectId, parentId],
  );
};

export const useRenameFile = () => useMutation(api.files.renameFile);

export const useUpdateFile = () => useMutation(api.files.updateFile);

export const useDeleteFile = () => useMutation(api.files.deleteFile);
