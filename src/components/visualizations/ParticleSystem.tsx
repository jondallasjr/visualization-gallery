"use client";

import React, { useEffect, useRef, useState } from 'react';

type ParticleConfig = {
  particleCount: number;
  particleSize: number;
  speedFactor: number;
  connectionRadius: number;
  mouseRadius: number;
  mouseForce: number;
  trailLength: number;
  decayConstant: number;
};

type ParticleTrailPoint = {
  x: number;
  y: number;
  time: number;
};

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  canvas: HTMLCanvasElement;
  hue: number;
  brightnessFactor: number;
  trail: ParticleTrailPoint[];

  constructor(x: number, y: number, canvas: HTMLCanvasElement) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.3; // Random velocity X
    this.vy = (Math.random() - 0.5) * 0.3; // Random velocity Y
    this.ax = 0; // Acceleration X
    this.ay = 0; // Acceleration Y
    this.canvas = canvas; // Reference to the canvas
    this.hue = Math.random() * 360; // Random hue for color
    this.brightnessFactor = 0.5 + Math.random() * 0.5; // Random brightness
    this.trail = []; // Array to store trail points
  }

  update(deltaTime: number, mouse: { x: number; y: number }) {
    // Apply mouse force
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 200) {
      const force = (1 - distance / 200) * 0.1;
      this.ax = (dx * force) / distance;
      this.ay = (dy * force) / distance;
    }

    // Update velocity and position
    this.vx += this.ax;
    this.vy += this.ay;

    // Add some random movement
    this.vx += (Math.random() - 0.5) * 0.1;
    this.vy += (Math.random() - 0.5) * 0.1;

    // Apply damping
    this.vx *= 0.99;
    this.vy *= 0.99;

    // Update position
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    // Wrap around edges
    if (this.x < 0) this.x = this.canvas.width;
    if (this.x > this.canvas.width) this.x = 0;
    if (this.y < 0) this.y = this.canvas.height;
    if (this.y > this.canvas.height) this.y = 0;

    // Reset acceleration
    this.ax = 0;
    this.ay = 0;

    // Slowly change hue
    this.hue = (this.hue + 0.1) % 360;

    // Add current position to trail
    this.trail.push({ x: this.x, y: this.y, time: Date.now() });

    // Limit trail length
    if (this.trail.length > 600) {
      this.trail.shift();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const intensity = Math.min(1, speed * 2);

    // Draw trail
    this.trail.forEach((point) => {
      const age = Date.now() - point.time; // Age of the trail point in milliseconds
      const opacity = Math.exp(-age / 1000); // Exponential decay
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.hue}, 80%, ${50 + intensity * 30}%, ${opacity * 0.5})`;
      ctx.fill();
    });

    // Draw particle
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, 80%, ${50 + intensity * 30}%, ${0.3 + intensity * 0.7})`;
    ctx.fill();
  }
}

const ParticleSystem: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [config] = useState<ParticleConfig>({
    particleCount: 3000,
    particleSize: 2,
    speedFactor: 0.3,
    connectionRadius: 100,
    mouseRadius: 200,
    mouseForce: 0.1,
    trailLength: 600,
    decayConstant: 1000,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = 0;

    // Initialize particles
    particlesRef.current = Array.from({ length: config.particleCount }, () =>
      new Particle(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        canvas
      )
    );

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    const render = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 16; // Normalize to ~60fps
      lastTime = currentTime;

      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        particle.update(deltaTime, mouseRef.current);
        particle.draw(ctx);
      });

      // Draw connections between nearby particles
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p1 = particlesRef.current[i];
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p2 = particlesRef.current[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < config.connectionRadius) {
            const alpha = (1 - distance / config.connectionRadius) * 0.2;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `hsla(${(p1.hue + p2.hue) / 2}, 80%, 50%, ${alpha})`;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render(0);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [config]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="rounded-lg overflow-hidden shadow-lg bg-black">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full cursor-none"
        />
      </div>
      <div className="mt-4 text-sm text-gray-600 text-center">
        Move your mouse/finger to interact with the particles
      </div>
    </div>
  );
};

export default ParticleSystem;