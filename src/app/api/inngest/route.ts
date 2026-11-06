import { serve } from "inngest/next";
import{inngest} from "../../../inngest/client";
import { demoError, demoGenerate } from "../../../inngest/functions";

import { chatReply } from "../../../inngest/chat";

export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [demoGenerate, demoError, chatReply],
});
