"use client";

import { useConvexAuth, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export const useCreateConversation = () => useMutation(api.conversations.create);
export const useSendMessage = () => useMutation(api.conversations.sendMessage);
export const useRetryMessage = () => useMutation(api.conversations.retryMessage);

export const useConversation = (conversationId: string | null | undefined) => {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(
    api.conversations.getById,
    isAuthenticated && conversationId
      ? { id: conversationId as Id<"conversations"> }
      : "skip",
  );
};

export const useConversations = (projectId: string, initialNumItems = 20) => {
  const { isAuthenticated } = useConvexAuth();
  return usePaginatedQuery(
    api.conversations.getByProject,
    isAuthenticated ? { projectId: projectId as Id<"projects"> } : "skip",
    { initialNumItems },
  );
};

export const useMessages = (
  conversationId: string | null | undefined,
  initialNumItems = 50,
) => {
  const { isAuthenticated } = useConvexAuth();
  const messages = usePaginatedQuery(
    api.conversations.getMessages,
    isAuthenticated && conversationId
      ? { conversationId: conversationId as Id<"conversations"> }
      : "skip",
    { initialNumItems },
  );
  console.log(messages.results);
  // Fetch the newest page first, then display messages chronologically.
  return { ...messages, results: [...messages.results].reverse() };
};
