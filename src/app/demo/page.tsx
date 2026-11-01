"use client"

import { Button } from "@/components/ui/button";
import {useState} from "react";

export default function DemoPage(){
    const [isLoading,setIsLoading]= useState(false);
    const [loading,setLoading]= useState(false);
    const handleBlocking=async()=>{
        setIsLoading(true);
        try {
            const res = await fetch("/api/demo/blocking",{method:"POST"})
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
            const res = await fetch("/api/demo/background",{method:"POST"})
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
    return (
        <div className='p-8 space-x-4'>
            <Button onClick={handleBlocking}>
               {isLoading ? "Loading..." : "Blocking API Call"}
            </Button>
            <Button onClick={handleBackground}>
                {loading ? "Loading..." : "Background API Call"}
            </Button>

        </div>
    )
}
