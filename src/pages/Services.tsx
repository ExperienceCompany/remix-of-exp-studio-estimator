import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Film, Camera, Scissors } from 'lucide-react';
import { VideoEditingEstimator } from '@/components/services/VideoEditingEstimator';

export default function Services() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">EXP</span>
            </div>
            <span className="font-bold text-xl">Post-Production Services</span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-12 text-center">
        <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Scissors className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Post-Production Services
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Professional video and photo editing services. No studio booking required.
        </p>
      </section>

      {/* Video Editing Estimator */}
      <section className="container pb-16">
        <div className="max-w-2xl mx-auto">
          <VideoEditingEstimator />
        </div>
      </section>
    </div>
  );
}
