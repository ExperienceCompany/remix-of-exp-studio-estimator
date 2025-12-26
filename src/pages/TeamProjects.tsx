import { TeamProjectEstimator } from "@/components/teamProjects/TeamProjectEstimator";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TeamProjects() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Team Projects</h1>
            <p className="text-sm text-muted-foreground">Points-Based Split System</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <TeamProjectEstimator />
      </main>
    </div>
  );
}
