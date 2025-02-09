"use client";

import ProjectAccordion from "@/components/ProjectAccordion";
import { Accordion } from "@/components/ui/accordion";
import type { DeploymentProps } from "@/types/deployments";
import React from "react";
import {
  ArrowUpRightIcon,
  Plus,
  RefreshCw,
  StarIcon,
  Trash,
} from "lucide-react";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function Home() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [starsCount, setStarsCount] = React.useState<number>(0);
  const [teamDeployments, setTeamDeployments] = React.useState<{
    [teamId: string]: {
      teamName: string;
      projects: {
        [projectName: string]: DeploymentProps[];
      };
    };
  }>({});
  const [teams, setTeams] = React.useState<
    Array<{ teamId: string; apiToken: string }>
  >([{ teamId: "", apiToken: "" }]);

  const addTeam = () => {
    setTeams([...teams, { teamId: "", apiToken: "" }]);
  };

  const removeTeam = (index: number) => {
    setTeams(teams.filter((_, i) => i !== index));
  };

  const updateTeam = (
    index: number,
    field: "teamId" | "apiToken",
    value: string
  ) => {
    const newTeams = [...teams];
    newTeams[index][field] = value;
    setTeams(newTeams);
  };

  const fetchDeployments = React.useCallback(async (currentTeams: Array<{ teamId: string; apiToken: string }>) => {
    try {
      setLoading(true);
      setError(null);

      if (currentTeams.length === 0) {
        throw new Error("At least one team is required");
      }
      
      const newTeamDeployments: typeof teamDeployments = {};
      
      for (const team of currentTeams) {
        if (!team.teamId && !process.env.NEXT_PUBLIC_VERCEL_TEAM_ID) {
          throw new Error("Team ID is required for all teams");
        }

        if (!team.apiToken && !process.env.NEXT_PUBLIC_VERCEL_API_TOKEN) {
          throw new Error("API Token is required for all teams");
        }

        const response = await fetch("/api/vercel", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            teamId: team.teamId || process.env.NEXT_PUBLIC_VERCEL_TEAM_ID,
            apiToken:
              team.apiToken || process.env.NEXT_PUBLIC_VERCEL_API_TOKEN,
          }),
        });
        
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch deployments");
        }

        const teamId = team.teamId || process.env.NEXT_PUBLIC_VERCEL_TEAM_ID || "default";
        newTeamDeployments[teamId] = {
          teamName: data?.team?.creator?.username || "Unknown Team",
          projects: data.deployments.reduce((acc: { [key: string]: DeploymentProps[] }, deployment: DeploymentProps) => {
            if (!acc[deployment.name]) {
              acc[deployment.name] = [];
            }
            acc[deployment.name].push(deployment);
            return acc;
          }, {}),
        };

        // Sort deployments for each project
        Object.values(newTeamDeployments[teamId].projects).forEach((deployments) => {
          deployments.sort((a, b) => b.createdAt - a.createdAt);
        }
      );
    }
    
    setTeamDeployments(newTeamDeployments);
  } catch (err) {
    setError(err instanceof Error ? err.message : "An unknown error occurred");
    toast({
      title: "Error",
      description: err instanceof Error ? err.message : "Failed to fetch deployments",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }},[toast]);

  const fetchStarsCount = React.useCallback(async () => {
    const res = await fetch(
      "https://api.github.com/repos/ThalesAugusto0/vercel-status-tracker"
    );
    const data = await res.json();
    setStarsCount(data.stargazers_count);
  }, []);

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchDeployments(teams);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchDeployments, teams]);

  React.useEffect(() => {
    fetchStarsCount();
  }, [fetchStarsCount]);

  const getProjectStats = () => {
    const allDeployments = Object.values(teamDeployments).flatMap((team) => Object.values(team.projects).flat());

    const validDeployments = allDeployments.filter((d) => typeof d.ready === "number" && typeof d.buildingAt === "number" && d.ready > d.buildingAt);

    const totalBuildTime = validDeployments.reduce((acc, d) => acc + (d.ready - d.buildingAt), 0)

    const stats = {
      totalDeployments: allDeployments.length,
      successfulDeployments: allDeployments.filter((d) => d.state === "READY").length,
      averageBuildTime: validDeployments.length > 0 ? (totalBuildTime / validDeployments.length / 1000).toFixed(1) : "0.0",
      mostActiveProject:
        Object.entries(
          allDeployments.reduce((acc: { [key: string]: number }, d) => {
            acc[d.name] = (acc[d.name] || 0) + 1;
            return acc;
          }, {})
        ).sort(([, a], [, b]) => b - a)[0]?.[0] || "None",
    };
    return stats;
  };

  return (
    <div className="flex flex-col min-h-screen p-4 gap-4 sm:p-4 font-[family-name:var(--font-geist-sans)] bg-background text-foreground">
      <header className="flex justify-between w-full max-w-4xl mx-auto font-mono mb-8">
        <Button className="p-0" variant="link" asChild>
          <a
            target="_blank"
            href="https://thalesasaraujo.dev/"
            rel="noreferrer"
          >
            Thales Augusto
          </a>
        </Button>
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" className="bg-card hover:bg-muted" asChild>
            <a
              target="_blank"
              href="https://github.com/ThalesAugusto0/vercel-status-tracker"
              className="flex items-center"
              rel="noreferrer"
            >
              <GitHubLogoIcon className="fill-current h-4 w-4 mr-4" />
              <StarIcon
                fill="currentColor"
                className="h-3 w-3 text-yellow-500 mr-1"
              />
              <span className="font-semibold">{starsCount}</span>
              <ArrowUpRightIcon className="h-4 w-4 ml-4" />
            </a>
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto mb-8">
        {teams.map((team, index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row justify-around items-center gap-2"
          >
            <div className="space-y-2 flex-1">
              <Input
                value={team.teamId}
                className="bg-card"
                placeholder="Vercel team id: team_xxxxxx"
                onChange={(e) => updateTeam(index, "teamId", e.target.value)}
              />
            </div>
            <div className="space-y-2 flex-1">
              <Input
                type="password"
                value={team.apiToken}
                className="bg-card"
                placeholder="Vercel API Token"
                onChange={(e) => updateTeam(index, "apiToken", e.target.value)}
              />
            </div>
            {index > 0 && (
              <Button
                variant="outline"
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => removeTeam(index)}
              >
                <Trash />
              </Button>
            )}
          </div>
        ))}
        <div className="flex justify-between">
          <Button
            variant="outline"
            className="bg-card hover:bg-muted"
            onClick={addTeam}
          >
            <Plus /> Add Team
          </Button>
          <Button
            variant="outline"
            className="bg-card hover:bg-muted"
            onClick={handleRefresh}
          >
            Fetch Deployments
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full max-w-4xl mx-auto mb-8">
        <div className="flex-1 bg-card p-4 rounded-lg shadow-sm">
          <h3 className="text-sm text-muted-foreground">Total Deployments</h3>
          <p className="text-2xl font-bold">
            {getProjectStats().totalDeployments}
          </p>
        </div>
        <div className="flex-1 bg-card p-4 rounded-lg shadow-sm">
          <h3 className="text-sm text-muted-foreground">Success Rate</h3>
          <p className="text-2xl font-bold">
            {((getProjectStats().successfulDeployments / getProjectStats().totalDeployments) * 100 || 0).toFixed(1)}%
          </p>
        </div>
        <div className="flex-1 bg-card p-4 rounded-lg shadow-sm">
          <h3 className="text-sm text-muted-foreground">Avg Build Time</h3>
          <p className="text-2xl font-bold">{getProjectStats().averageBuildTime}s</p>
        </div>
        <div className="flex-1 bg-card p-4 rounded-lg shadow-sm">
          <h3 className="text-sm text-muted-foreground">Most Active</h3>
          <p className="text-2xl font-bold truncate">
            {getProjectStats().mostActiveProject}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mx-auto w-full max-w-4xl mb-8">
        <h1 className="text-2xl font-bold">
          Vercel Deployments | {getProjectStats().totalDeployments}
        </h1>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2 bg-card hover:bg-muted"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>
      <main className="flex flex-col flex-wrap gap-2 justify-center items-center w-full max-w-4xl mx-auto">
        {loading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <p className="text-lg text-foreground">Loading deployments...</p>
          </div>
        ) : error ? (
          <div className="text-center space-y-2">
            <p>Please enter valid Vercel Team ID and API Token.</p>
            <small className="text-sm text-muted-foreground">
              Get your{" "}
              <span className="font-bold text-primary">
                <Link href="https://vercel.com/docs/accounts/create-a-team#find-your-team-id">
                  Team ID
                </Link>
              </span>{" "}
              and{" "}
              <span className="font-bold text-primary">
                <Link href="https://vercel.com/guides/how-do-i-use-a-vercel-api-access-token">
                  API Token
                </Link>
              </span>{" "}
              from Vercel.
            </small>
          </div>
        ) : (
          Object.entries(teamDeployments).map(([teamId, teamData]) => (
            <div key={teamId} className="w-full max-w-4xl mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {teamData.teamName}
              </h2>
              {Object.entries(teamData.projects).map(
                ([projectName, deployments]) => (
                  <Accordion
                    key={`${teamId}-${projectName}`}
                    type="single"
                    collapsible
                    className="w-full mb-4"
                  >
                    <ProjectAccordion
                      teamId={teamId}
                      teamName={teamData.teamName}
                      name={projectName}
                      deployments={deployments}
                    />
                  </Accordion>
                )
              )}
            </div>
          ))
        )}
      </main>

      <footer className="mt-auto py-6 w-full">
        <div className="flex gap-4 flex-wrap items-center justify-center max-w-4xl mx-auto">
          <p className="text-sm text-muted-foreground">Built with:</p>
          <Button variant="link" asChild>
            <Link href="https://nextjs.org">Next.js</Link>
          </Button>
          <Button variant="link" asChild>
            <Link href="https://tailwindcss.com">TailwindCSS</Link>
          </Button>
          <Button variant="link" asChild>
            <Link href="https://ui.shadcn.com">Shadcn/UI</Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}
