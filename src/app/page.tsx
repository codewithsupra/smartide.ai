import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {ProjectsList} from "@/components/projects-list";

export default function Home() {
  return (
    <div>
      <header className="flex items-center justify-end gap-2 p-4">
        <Suspense>
          <Show when="signed-out">
            <SignInButton />
            <SignUpButton>
              <button className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700">
                Sign Up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </Suspense>
      </header>
      <Button variant="default">Destructive</Button>
      <ProjectsList />
    </div>
  );
}
