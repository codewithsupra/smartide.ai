import {inngest} from "@/inngest/client";

export async function POST(){
    await inngest.send({
        name: "demo/error",
        data: { message: "This is a test error from the Inngest function." },
    });

    return Response.json({ status: "Error event sent" });
}
