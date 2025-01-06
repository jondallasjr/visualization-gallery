// src/components/visualizations/LiquidMorph.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Define types for points and shapes
type Point = { x: number; y: number };
type Shape = Point[];

const LiquidMorph = () => {
  const [time, setTime] = useState<number>(0);
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);

  // Define shape paths with equal number of points for smooth morphing
  const shapes: Record<string, Shape> = {
    circle: generateCirclePoints(32),
    star: generateStarPoints(32),
    square: generateSquarePoints(32),
    flower: generateFlowerPoints(32),
  };

  // Track current and next shapes for morphing
  const [currentShape, setCurrentShape] = useState<string>('circle');
  const [nextShape, setNextShape] = useState<string>('star');
  const [morphProgress, setMorphProgress] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  function generateCirclePoints(numPoints: number): Shape {
    return Array.from({ length: numPoints }, (_, i) => {
      const angle = (i * 2 * Math.PI) / numPoints;
      const radius = 100;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    });
  }

  function generateStarPoints(numPoints: number): Shape {
    return Array.from({ length: numPoints }, (_, i) => {
      const angle = (i * 2 * Math.PI) / numPoints;
      const radius = i % 2 === 0 ? 100 : 50;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    });
  }

  function generateSquarePoints(numPoints: number): Shape {
    const points: Shape = [];
    const size = 100;
    const pointsPerSide = numPoints / 4;

    // Top side
    for (let i = 0; i < pointsPerSide; i++) {
      points.push({
        x: -size + (i * 2 * size) / pointsPerSide,
        y: -size,
      });
    }
    // Right side
    for (let i = 0; i < pointsPerSide; i++) {
      points.push({
        x: size,
        y: -size + (i * 2 * size) / pointsPerSide,
      });
    }
    // Bottom side
    for (let i = 0; i < pointsPerSide; i++) {
      points.push({
        x: size - (i * 2 * size) / pointsPerSide,
        y: size,
      });
    }
    // Left side
    for (let i = 0; i < pointsPerSide; i++) {
      points.push({
        x: -size,
        y: size - (i * 2 * size) / pointsPerSide,
      });
    }

    return points;
  }

  function generateFlowerPoints(numPoints: number): Shape {
    return Array.from({ length: numPoints }, (_, i) => {
      const angle = (i * 2 * Math.PI) / numPoints;
      const radius = 100 * (1 + 0.3 * Math.sin(6 * angle));
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };
    });
  }

  function interpolatePoints(pointsA: Shape, pointsB: Shape, progress: number): Shape {
    // Ensure both shapes have the same number of points
    if (pointsA.length !== pointsB.length) {
      console.error('Shapes must have the same number of points for interpolation');
      return pointsA;
    }

    return pointsA.map((pointA, i) => ({
      x: pointA.x + (pointsB[i].x - pointA.x) * progress,
      y: pointA.y + (pointsB[i].y - pointA.y) * progress,
    }));
  }

  function pointsToPath(points: Shape): string {
    return points.reduce((path: string, point: Point, i: number) => {
      const command = i === 0 ? 'M' : 'L';
      return `${path} ${command} ${point.x} ${point.y}`;
    }, '') + ' Z';
  }

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== null) {
      const deltaTime = time - previousTimeRef.current;
      setTime((prevTime) => prevTime + deltaTime);

      if (isTransitioning) {
        setMorphProgress((prev) => {
          const newProgress = prev + deltaTime * 0.001;
          if (newProgress >= 1) {
            setIsTransitioning(false);
            setCurrentShape(nextShape);
            return 0;
          }
          return newProgress;
        });
      }
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [isTransitioning, nextShape]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);

  const transitionToShape = (shapeName: string) => {
    if (shapeName !== currentShape && !isTransitioning) {
      setNextShape(shapeName);
      setIsTransitioning(true);
      setMorphProgress(0);
    }
  };

  const currentPoints = isTransitioning
    ? interpolatePoints(shapes[currentShape], shapes[nextShape], morphProgress)
    : shapes[currentShape];

  // Calculate liquid blob effect
  const blobEffect = (progress: number): Shape => {
    const amplitude = 10 * (1 - Math.abs(progress - 0.5) * 2);
    return currentPoints.map((point, i) => {
      const angle = (i * 2 * Math.PI) / currentPoints.length + time * 0.001;
      return {
        x: point.x + Math.cos(angle * 3) * amplitude,
        y: point.y + Math.sin(angle * 2) * amplitude,
      };
    });
  };

  const liquidPathD = pointsToPath(blobEffect(morphProgress));

  return (
    <div className="w-full max-w-4xl mx-auto p-4 flex flex-col items-center">
      <div className="rounded-lg overflow-hidden shadow-lg bg-gray-900 p-8 w-full max-w-2xl">
        <svg viewBox="-150 -150 300 300" className="w-full h-96">
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff3e88" stopOpacity="0.8">
                <animate
                  attributeName="stop-color"
                  values="#ff3e88;#ff8b3e;#3eff8b;#3e88ff;#ff3e88"
                  dur="10s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="100%" stopColor="#3e88ff" stopOpacity="0.8">
                <animate
                  attributeName="stop-color"
                  values="#3e88ff;#ff3e88;#ff8b3e;#3eff8b;#3e88ff"
                  dur="10s"
                  repeatCount="indefinite"
                />
              </stop>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={liquidPathD}
            fill="url(#gradient1)"
            filter="url(#glow)"
            stroke="white"
            strokeWidth="0.5"
          />
        </svg>
      </div>

      <div className="mt-4 flex justify-center gap-2 flex-wrap">
        {Object.keys(shapes).map((shapeName) => (
          <button
            key={shapeName}
            onClick={() => transitionToShape(shapeName)}
            className={`px-4 py-2 rounded ${
              currentShape === shapeName
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            } transition-colors`}
          >
            {shapeName.charAt(0).toUpperCase() + shapeName.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LiquidMorph;