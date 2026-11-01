import { inngest } from "@/inngest/client";

export async function POST() {
  await inngest.send({
    name: "demo/generate",
    data: { prompt: "Write a vegetarian lasagna recipe for 4 people." },
  });

  return Response.json({ status: "Started" });
}
