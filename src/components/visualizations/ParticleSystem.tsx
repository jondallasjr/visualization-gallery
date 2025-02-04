"use client";

import React, { useEffect, useRef, useState } from 'react';

class Particle {
    x: number;
    y: number;
    size: number;
    velocityX: number;
    velocityY: number;
    currentColor: string;
    targetColor: string;
    trail: { x: number; y: number; opacity: number }[];
    minimumSpeed: number;
    createdAt: number;

    constructor(x: number, y: number, size: number, color: string) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.velocityX = Math.random() * 2 - 1;
        this.velocityY = Math.random() * 2 - 1;
        this.currentColor = color;
        this.targetColor = this.generateRandomColor();
        this.trail = [];
        this.minimumSpeed = 0.1;
        this.createdAt = Date.now();
    }

    // Generate a random color in the format "r, g, b"
    generateRandomColor(): string {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return `${r}, ${g}, ${b}`;
    }

    // Interpolate between currentColor and targetColor
    updateColor() {
        const current = this.currentColor.split(',').map(Number);
        const target = this.targetColor.split(',').map(Number);
        const newColor = current.map((c, i) => {
            const delta = target[i] - c;
            return c + delta * 0.01; // Adjust the speed of color change here
        });
        this.currentColor = newColor.join(', ');

        // If the color is close to the target, generate a new target
        if (newColor.every((c, i) => Math.abs(c - target[i]) < 1)) {
            this.targetColor = this.generateRandomColor();
        }
    }

    update(canvas: HTMLCanvasElement, mouseX: number, mouseY: number, isCursorActive: boolean) {
        this.updateColor(); // Update the particle's color

        // Smoothly move towards the cursor if active
        if (isCursorActive) {
            const dx = mouseX - this.x;
            const dy = mouseY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 200) {
                // Apply a smoother attraction force
                this.velocityX += dx * 0.01; // Reduced force for smoother movement
                this.velocityY += dy * 0.01;
            }
        }

        // Apply damping to smooth out velocity changes
        this.velocityX *= 0.998; // Slower deceleration (closer to 1)
        this.velocityY *= 0.998;

        // Ensure the particle never stops moving
        const speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
        if (speed < this.minimumSpeed) {
            const angle = Math.atan2(this.velocityY, this.velocityX);
            this.velocityX = Math.cos(angle) * this.minimumSpeed;
            this.velocityY = Math.sin(angle) * this.minimumSpeed;
        }

        // Apply velocity
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Check for edge collisions
        const hitLeft = this.x < 0;
        const hitRight = this.x > canvas.width;
        const hitTop = this.y < 0;
        const hitBottom = this.y > canvas.height;

        // Bounce off edges
        if (hitLeft || hitRight) {
            this.velocityX *= -1; // Reverse horizontal velocity
            this.x = Math.max(0, Math.min(canvas.width, this.x)); // Clamp position to canvas bounds
        }
        if (hitTop || hitBottom) {
            this.velocityY *= -1; // Reverse vertical velocity
            this.y = Math.max(0, Math.min(canvas.height, this.y)); // Clamp position to canvas bounds
        }

        // Add current position to trail
        this.trail.push({ x: this.x, y: this.y, opacity: 1 });

        // If the particle hit an edge, break the trail
        if (hitLeft || hitRight || hitTop || hitBottom) {
            this.trail.push({ x: this.x, y: this.y, opacity: 0 }); // Add a "break" point
        }

        // Limit trail length and fade out older points
        if (this.trail.length > 2000) {
            this.trail.shift();
        }
        this.trail.forEach((point, index) => {
            point.opacity = Math.pow(0.9, index); // Slower decay for longer-lasting trails
        });
    }

    draw(ctx: CanvasRenderingContext2D) {
        // Draw smooth trail lines
        ctx.beginPath();
        let isFirstPoint = true;

        for (let i = 0; i < this.trail.length; i++) {
            const point = this.trail[i];

            // If opacity is 0, it's a break point
            if (point.opacity === 0) {
                ctx.stroke(); // Draw the current path
                ctx.beginPath(); // Start a new path
                isFirstPoint = true;
                continue;
            }

            if (isFirstPoint) {
                ctx.moveTo(point.x, point.y);
                isFirstPoint = false;
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }

        // Adjust trail color to retain some of the original color
        const trailOpacity = Math.max(0.2, this.trail[this.trail.length - 1]?.opacity || 0); // Ensure minimum opacity
        ctx.strokeStyle = `rgba(${this.currentColor}, ${trailOpacity})`; // Retain some color
        ctx.lineWidth = this.size;
        ctx.stroke();
        ctx.closePath();

        // Draw particle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.currentColor}, 1)`;
        ctx.fill();
        ctx.closePath();
    }
}

const ParticleSystem: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const mouseX = useRef<number>(0);
    const mouseY = useRef<number>(0);
    const isCursorActive = useRef<boolean>(false);
    const cursorTimeout = useRef<NodeJS.Timeout | null>(null);
    const animationFrameId = useRef<number>(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const MAX_PARTICLES = 500; // Adjust this number based on performance needs

    // Toggle full-screen mode
    const toggleFullScreen = () => {
        if (!canvasRef.current) return;

        if (!isFullScreen) {
            if (canvasRef.current.requestFullscreen) {
                canvasRef.current.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // Handle full-screen change events
    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas dimensions to match its container
        const { width, height } = canvas.getBoundingClientRect();
        canvas.width = width;
        canvas.height = height;

        // Initialize particles
        const MAX_PARTICLES = 500;
        const particles: Particle[] = [];
        const colors = ['85, 195, 95', '135, 60, 180'];

        for (let i = 0; i < MAX_PARTICLES; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const size = Math.random() * 1 + 0.5;
            const color = colors[Math.floor(Math.random() * colors.length)];
            particles.push(new Particle(x, y, size, color));
        }
        particlesRef.current = particles;

        // Track mouse position
        const handleMouseMove = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseX.current = event.clientX - rect.left;
            mouseY.current = event.clientY - rect.top;

            // Mark cursor as active
            isCursorActive.current = true;

            // Reset cursor inactivity timeout
            if (cursorTimeout.current) clearTimeout(cursorTimeout.current);
            cursorTimeout.current = setTimeout(() => {
                isCursorActive.current = false;
            }, 1000); // 1 second of inactivity
        };

        canvas.addEventListener('mousemove', handleMouseMove);

        // Animation loop
        const animate = () => {
            // Clear canvas
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        
            // Remove expired particles (older than 60 seconds)
            const now = Date.now();
            particlesRef.current = particlesRef.current.filter(
                (particle) => now - particle.createdAt < 60000 // 60 seconds in milliseconds
            );
        
            // Remove excess particles if the count exceeds MAX_PARTICLES
            if (particlesRef.current.length > MAX_PARTICLES) {
                // Remove the oldest particles first
                particlesRef.current.sort((a, b) => a.createdAt - b.createdAt); // Sort by creation time
                particlesRef.current = particlesRef.current.slice(-MAX_PARTICLES); // Keep only the newest particles
            }
        
            // Add new particles if needed
            if (particlesRef.current.length < MAX_PARTICLES) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = Math.random() * 1 + 0.5;
                const color = colors[Math.floor(Math.random() * colors.length)];
                particlesRef.current.push(new Particle(x, y, size, color));
            }
        
            // Update and draw remaining particles
            particlesRef.current.forEach((particle) => {
                particle.update(canvas, mouseX.current, mouseY.current, isCursorActive.current);
                particle.draw(ctx);
            });
        
            // Request the next frame
            animationFrameId.current = requestAnimationFrame(animate);
        };

        // Start the animation loop
        animationFrameId.current = requestAnimationFrame(animate);

        // Cleanup
        return () => {
            canvas.removeEventListener('mousemove', handleMouseMove);
            if (cursorTimeout.current) clearTimeout(cursorTimeout.current);
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', backgroundColor: 'black' }}
            />
            <button
                onClick={toggleFullScreen}
                style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    padding: '8px 16px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                }}
            >
                {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            </button>
        </div>
    );
};

export default ParticleSystem;