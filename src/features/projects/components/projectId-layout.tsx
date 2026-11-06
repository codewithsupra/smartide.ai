"use client";

import {Allotment} from "allotment";
import {Navbar} from "@/features/projects/components/navbar";
import  ConversationsSidebar  from "@/features/conversations/components/conversations-sidebar";
import { useSendMessage } from "@/features/conversations/hooks/use-conversations";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_SIDEBAR_WIDTH = 300;
const DEFAULT_MAIN_SIZE = 1000;

export const ProjectIdLayout = ({ children, projectId }: { children: React.ReactNode; projectId: string }) => {
  const sendMessage = useSendMessage();
  return (
    <div className="flex flex-col h-screen w-full">
        <Navbar projectId={projectId} />
        <div className="flex flex-1 overflow-hidden">
            <Allotment className="flex-1" defaultSizes={[DEFAULT_SIDEBAR_WIDTH, DEFAULT_MAIN_SIZE]} >
                <Allotment.Pane  snap minSize={MIN_SIDEBAR_WIDTH} maxSize={MAX_SIDEBAR_WIDTH} preferredSize={DEFAULT_SIDEBAR_WIDTH}>
                    <div className="h-full min-h-0">
                       <ConversationsSidebar
                         key={projectId}
                         projectId={projectId}
                         onSend={async (conversationId, message) => {
                           if (message.files.length > 0) throw new Error("Attachments are not supported yet.");
                           await sendMessage({ conversationId, content: message.text, requestId: crypto.randomUUID() });
                         }}
                       />
                    </div>
                </Allotment.Pane>
                <Allotment.Pane>
              {children}
                </Allotment.Pane>
            </Allotment>

        </div>

    </div>
  );
}
