"use client";

import React, { useState, lazy, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Lazy load visualization components
const ParticleSystem = lazy(() => import('./visualizations/ParticleSystem'));
const LiquidMorph = lazy(() => import('./visualizations/LiquidMorph'));
const CameraVision = lazy(() => import('./visualizations/CameraVision')); // Add this line

type Visualization = {
  name: string;
  component: React.ComponentType;
  description: string;
};

const visualizations: Record<string, Visualization> = {
  particles: {
    name: 'Particle System',
    component: ParticleSystem,
    description: 'Interactive particle system that responds to cursor movement',
  },
  liquidMorph: {
    name: 'Liquid Morph',
    component: LiquidMorph,
    description: 'Smooth morphing between different shapes with a liquid effect',
  },
  cameraVision: { // Add this entry
    name: 'Camera Vision',
    component: CameraVision,
    description: 'Real-time camera feed analyzed by OpenAI Vision',
  },
  // Add more visualizations here
};

const VisualizationGallery = () => {
  const [activeViz, setActiveViz] = useState<string | null>(null);

  const ActiveComponent = activeViz ? visualizations[activeViz].component : null;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {!activeViz ? (
          // Gallery View
          <>
            <header className="text-center">
              <h1 className="text-4xl font-bold mb-4">Visualization Gallery</h1>
              <p className="text-muted-foreground mb-8">
                Interactive data visualizations and generative art
              </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(visualizations).map(([key, { name, description }]) => (
                <Card
                  key={key}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setActiveViz(key)}
                >
                  <CardContent className="p-6">
                    <h2 className="text-2xl font-semibold mb-4">{name}</h2>
                    <p className="text-muted-foreground">{description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          // Visualization View
          <>
            <Button
              onClick={() => setActiveViz(null)}
              variant="outline"
              className="mb-6"
            >
              Back to Gallery
            </Button>

            <div className="h-[80vh] w-full bg-black rounded-lg overflow-hidden">
              <Suspense
                fallback={
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="text-muted-foreground">
                      Loading visualization...
                    </div>
                  </div>
                }
              >
                {ActiveComponent && <ActiveComponent />}
              </Suspense>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VisualizationGallery;