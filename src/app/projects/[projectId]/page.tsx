import { ProjectIdView } from "@/features/projects/components/project-id-view";

type ProjectIdPageProps = {
  params: Promise<{projectId: string}>;
};
export default async function ProjectIdPage({params}:ProjectIdPageProps) {
    const { projectId } = await params;
    console.log("ProjectIdPage projectId:", projectId);
  return (
    <ProjectIdView projectId={projectId} />
  );
}
