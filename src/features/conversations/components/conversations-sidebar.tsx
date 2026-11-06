"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { ConvexError } from "convex/values";
import { CopyIcon, Loader2Icon, MessageSquareIcon, PlusIcon, RotateCcwIcon } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { useConversations, useCreateConversation, useMessages, useRetryMessage } from "../hooks/use-conversations";

type Props = {
  projectId: string;
  onSend?: (conversationId: Id<"conversations">, message: PromptInputMessage) => Promise<void>;
};

function ConversationsSidebar({ projectId, onSend }: Props) {
  const { userId } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const conversations = useConversations(projectId);
  const createConversation = useCreateConversation();
  const retryMessage = useRetryMessage();
  const [retrying, setRetrying] = useState<Id<"messages"> | null>(null);
  const [selected, setSelected] = useState<{ projectId: string; id: Id<"conversations"> } | null>(null);
  const conversationId = selected?.projectId === projectId
    ? selected.id : conversations.results[0]?._id ?? null;
  const messages = useMessages(conversationId);
  const [draft, setDraft] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isProcessing = messages.results.some((message) => message.status === "processing");
  const busy = isSending || isProcessing || retrying !== null;

  const handleNewConversation = async () => {
    if (isCreating || busy) return;
    setIsCreating(true);
    setError(null);
    try {
      const id = await createConversation({ projectId: projectId as Id<"projects"> });
      setSelected({ projectId, id });
      setDraft("");
    } catch (error) {
      setError(error instanceof ConvexError && typeof error.data === "string"
        ? error.data : "Could not create a conversation. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!onSend || busy || !message.text.trim()) return;
    setIsSending(true);
    setError(null);
    try {
      let id = conversationId;
      if (!id) {
        id = await createConversation({
          projectId: projectId as Id<"projects">,
          title: message.text.trim().slice(0, 60),
        });
        setSelected({ projectId, id });
      }
      await onSend(id, message);
      setDraft("");
    } catch (error) {
      setError(error instanceof ConvexError && typeof error.data === "string"
        ? error.data : "Could not send your message. Please try again.");
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return (
    <aside aria-label="Project conversations" className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <header className="flex h-10 shrink-0 items-center gap-2 border-b px-3">
        <MessageSquareIcon aria-hidden="true" className="size-4 text-muted-foreground" />
        <h2 className="flex-1 text-sm font-medium">Conversations</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="New conversation"
          title="New conversation"
          disabled={!isAuthenticated || isCreating || busy}
          onClick={handleNewConversation}
        >
          {isCreating ? <Loader2Icon aria-hidden="true" className="size-3.5 animate-spin" /> : <PlusIcon aria-hidden="true" className="size-3.5" />}
        </Button>
      </header>

      <div className="shrink-0 space-y-1 border-b p-2">
        <select
            aria-label="Choose a conversation"
            value={conversationId ?? ""}
            disabled={busy || isCreating || conversations.results.length === 0}
            onChange={(event) => {
              setSelected({ projectId, id: event.target.value as Id<"conversations"> });
              setDraft("");
              setError(null);
            }}
            className="h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {conversations.results.length === 0 && (
            <option value="">{conversations.status === "LoadingFirstPage" ? "Loading conversations…" : "No conversations yet"}</option>
          )}
          {selected?.projectId === projectId && !conversations.results.some((item) => item._id === selected.id) && (
            <option value={selected.id}>New conversation</option>
          )}
          {conversations.results.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}
        </select>
        {(conversations.status === "CanLoadMore" || conversations.status === "LoadingMore") && (
          <Button type="button" variant="ghost" size="xs" disabled={conversations.status === "LoadingMore"} onClick={() => conversations.loadMore(20)}>
            {conversations.status === "LoadingMore" ? "Loading…" : "More conversations"}
          </Button>
        )}
      </div>

      <Conversation key={conversationId ?? projectId} className="min-h-0" aria-label="Conversation messages">
        <ConversationContent className="gap-5 p-3">
          {conversationId && messages.status === "LoadingFirstPage" ? (
            <p role="status" className="py-6 text-center text-xs text-muted-foreground">Loading messages…</p>
          ) : messages.results.length === 0 ? (
            <ConversationEmptyState
              title="What would you like to build?"
              description="Start a conversation about your project."
              icon={<MessageSquareIcon aria-hidden="true" className="size-7" />}
            />
          ) : messages.results.map((message) => (
            <Message key={message._id} from={message.senderId === userId ? "user" : "assistant"}>
              <MessageContent>
                {message.senderId === userId ? (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                ) : (
                  <MessageResponse>{message.content}</MessageResponse>
                )}
                {message.status === "processing" && <p role="status" className="text-xs text-muted-foreground">Thinking…</p>}
                {message.status === "cancelled" && <p className="text-xs text-muted-foreground">Cancelled</p>}
                {message.status === "failed" && (
                  <div className="space-y-2">
                    <p role="alert" className="text-xs text-destructive">{message.error ?? "Could not generate a reply."}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={busy || messages.results.at(-1)?._id !== message._id}
                      onClick={async () => {
                        setRetrying(message._id);
                        setError(null);
                        try { await retryMessage({ messageId: message._id }); }
                        catch { setError("Could not retry this reply. Please try again."); }
                        finally { setRetrying(null); }
                      }}
                    >
                      <RotateCcwIcon aria-hidden="true" className="size-3" />Retry reply
                    </Button>
                  </div>
                )}
              </MessageContent>
              {message.content && (
                <MessageActions>
                  <MessageAction
                    label="Copy message"
                    tooltip="Copy message"
                    onClick={() => {
                      void navigator.clipboard.writeText(message.content).catch(() => setError("Could not copy this message."));
                    }}
                  >
                    <CopyIcon aria-hidden="true" className="size-3.5" />
                  </MessageAction>
                </MessageActions>
              )}
            </Message>
          ))}
          {(messages.status === "CanLoadMore" || messages.status === "LoadingMore") && (
            <Button type="button" variant="ghost" size="xs" disabled={messages.status === "LoadingMore"} onClick={() => messages.loadMore(50)}>
              {messages.status === "LoadingMore" ? "Loading…" : "Load more messages"}
            </Button>
          )}
        </ConversationContent>
        <ConversationScrollButton aria-label="Scroll to latest message" />
      </Conversation>

      <div className="shrink-0 border-t p-3">
        {error && <p role="alert" className="mb-2 text-xs text-destructive">{error}</p>}
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              aria-label="Message"
              placeholder="Ask about your project…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={!isAuthenticated || !onSend || busy || isCreating}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <span className="text-xs text-muted-foreground">{busy ? "Working…" : "Project chat"}</span>
            <PromptInputSubmit
              title={!onSend ? "Message sending is not available yet" : "Send message"}
              status={busy ? "submitted" : "ready"}
              disabled={!isAuthenticated || !onSend || busy || isCreating || !draft.trim()}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </aside>
  );
}

export default ConversationsSidebar;
