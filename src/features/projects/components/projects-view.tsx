"use client";

import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SparkleIcon } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import {FaGithub} from "react-icons/fa";
import { ProjectsList } from "./projects-list"
import { useCreateProject } from "../hooks/use-projects";
import {adjectives,animals,colors,uniqueNamesGenerator} from 'unique-names-generator'
import { useEffect, useState } from "react";
import { useConvexAuth } from "convex/react";
import { ProjectsDialog } from "./projects-dialog";
import { PolarisLogo } from "./polaris-logo";

const font=Poppins({subsets:["latin"],weight:["400","500","600","700"]});

export const ProjectsView = () => {
    const createNewProject = useCreateProject();
    const { isAuthenticated } = useConvexAuth();
    const [showAllProjects, setShowAllProjects] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target;
            if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select"))) return;
            if (isAuthenticated && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                setShowAllProjects(true);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isAuthenticated]);
  return (
    <div className=" min-h-screen bg-sidebar flex flex-col items-center    justify-center p-6 md:p-16 ">
        <div className="w-full max-w-sm mx-auto flex flex-col gap-4  items-center">
            <div className="flex justify-between gap-4 w-full items-center">

                <div className="flex items-center gap-3 w-full group/logo">
                <PolarisLogo className="size-10 shrink-0 text-foreground md:size-12" />
                <h1 className={cn("text-4xl font-semibold", font.className)}>Polaris</h1>
                </div>
            </div>

            <div className="flex flex-col gap-4 w-full">
                <div className="grid grid-cols-2 gap-2">
                    <Button disabled={!isAuthenticated} variant="outline" onClick={
                        ()=>{
                            const projectName=uniqueNamesGenerator({
                                dictionaries: [adjectives, colors, animals],
                                separator: '-',
                                style: 'lowerCase',
                                length: 3
                            });
                            createNewProject({
                                name: projectName
                            });
                        }
                    } className="h-full items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none">
                        <div className=" flex items-center justify-between w-full">
                            <SparkleIcon className="size-6" />
                            <Kbd  className='bg-accent border'>&#8984;J</Kbd>
                        </div>
                        <div>
                            <span className="text-sm">
                                New Project
                            </span>
                        </div>
                    </Button>
                    <Button  variant="outline" onClick={()=>{}} className="h-full items-start justify-start p-4 bg-background border flex flex-col gap-6 rounded-none">
                        <div className=" flex items-center justify-between w-full">
                            <FaGithub className="size-6" />
                            <Kbd  className='bg-accent border'>&#8984;I</Kbd>
                        </div>
                        <div>
                            <span className="text-sm">
                                Import Project
                            </span>
                        </div>
                    </Button>
                </div>

                <ProjectsList onViewAll={() => setShowAllProjects(true)} />
                <ProjectsDialog open={showAllProjects && isAuthenticated} onOpenChange={setShowAllProjects} />
            </div>


        </div>
        </div>
  );
}

