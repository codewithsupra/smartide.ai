"use client"
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import {useRef, useState} from "react";
import { useAuth } from "@clerk/nextjs";

export default function DemoPage(){

    const {userId}=useAuth();
    const conversationId = useRef<string | null>(null);
    const conversationHeaders = () => {
        conversationId.current ??= crypto.randomUUID();
        return { "x-conversation-id": conversationId.current };
    };
    const [isLoading,setIsLoading]= useState(false);
    const [loading,setLoading]= useState(false);
    const handleBlocking=async()=>{
        setIsLoading(true);
        try {
            const res = await fetch("/api/demo/blocking",{method:"POST", headers: conversationHeaders()})
            if (!res.ok) {
                throw new Error(`Request failed with status ${res.status}`)
            }
            const data = await res.json();
            console.log(res.status, data.text);
        } catch (error) {
            console.error("Blocking API call failed:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const handleBackground=async()=>{
        setLoading(true);
        try {
            const res = await fetch("/api/demo/background",{method:"POST", headers: conversationHeaders()})
            if (!res.ok) {
                throw new Error(`Request failed with status ${res.status}`)
            }
            const data = await res.json();
            console.log(res.status, data.status);
        } catch (error) {
            console.error("Background API call failed:", error);
        } finally {
            setLoading(false);
         }
    }

        const handleClientError=()=>{
            Sentry.logger.info("User attempted to trigger a client-side error", { userId });
            Sentry.captureMessage("Client-side error triggered", {
                level: "error",
                extra: { userId },
            });
        throw new Error("Client-side error triggered");
        }

        const handleApiError=async()=>{
            await fetch("/api/demo/error",{method:"POST"})
        }

        const handleInngestError=async()=>{
            await fetch("/api/demo/inngest-error",{method:"POST"})
        }
    return (
        <div className='p-8 space-x-4'>
            <Button onClick={handleBlocking}>
               {isLoading ? "Loading..." : "Blocking API Call"}
            </Button>
            <Button onClick={handleBackground}>
                {loading ? "Loading..." : "Background API Call"}
            </Button>
            <Button variant={"destructive"} onClick={handleClientError}>
                Client Error
            </Button>
            <Button variant={'destructive'} onClick={handleApiError}>
                API Error
            </Button>
            <Button variant={'destructive'} onClick={handleInngestError}>
                Inngest Error
            </Button>

        </div>
    )
}
