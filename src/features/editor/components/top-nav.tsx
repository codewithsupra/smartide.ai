"use client";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useEditor } from "../hooks/use-editor";
import { Tab } from "./tab";


export const TopNavigation = ({ project }: { project: string }) => {
  const projectId = project as Id<"projects">;
  const { tabState: { openTabs } } = useEditor(projectId);

  return (
    <ScrollArea className="min-w-0 flex-1 bg-sidebar">
      <nav aria-label="Editor tabs" className="flex h-8.75 min-w-max items-center border-b">
        {openTabs.map((fileId, idx) => (
          <Tab key={fileId} fileId={fileId} isFirst={idx === 0} projectId={projectId} />
        ))}
      </nav>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
