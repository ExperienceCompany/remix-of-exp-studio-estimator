import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Scissors, Film, Camera } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VideoEditingEstimator } from '@/components/services/VideoEditingEstimator';
import { PhotoEditingEstimator } from '@/components/services/PhotoEditingEstimator';

export default function Services() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-foreground flex items-center justify-center">
              <span className="text-background font-bold text-sm">EXP</span>
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
        <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Scissors className="h-8 w-8 text-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          Post-Production Services
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Professional video and photo editing services. No studio booking required.
        </p>
      </section>

      {/* Estimator Tabs */}
      <section className="container pb-16">
        <div className="max-w-2xl mx-auto">
          <Tabs defaultValue="video" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="video" className="flex items-center gap-2">
                <Film className="h-4 w-4" />
                Video Editing
              </TabsTrigger>
              <TabsTrigger value="photo" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Photo Editing
              </TabsTrigger>
            </TabsList>
            <TabsContent value="video">
              <VideoEditingEstimator />
            </TabsContent>
            <TabsContent value="photo">
              <PhotoEditingEstimator />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
