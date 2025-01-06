import React, { useEffect, useRef, useState } from 'react';

const PsychedelicAutomata = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Cell[][] | null>(null);
  const nextGridRef = useRef<Cell[][] | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [config] = useState({
    cellSize: 4,
    updateInterval: 50,
    colorMutationRate: 0.1,
    colorInheritance: 0.7,
    initialDensity: 0.3,
  });

  // Audio analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const beatThreshold = 0.5; // Adjust for sensitivity
  const beatDecay = 0.95; // Smoothing factor for beat detection
  const lastBeatTimeRef = useRef<number>(0);

  class Cell {
    alive: boolean;
    hue: number;
    saturation: number;
    brightness: number;
    age: number;

    constructor(alive: boolean = false) {
      this.alive = alive;
      this.hue = Math.random() * 360;
      this.saturation = 70 + Math.random() * 30;
      this.brightness = 50 + Math.random() * 50;
      this.age = 0;
    }

    clone(): Cell {
      const newCell = new Cell(this.alive);
      newCell.hue = this.hue;
      newCell.saturation = this.saturation;
      newCell.brightness = this.brightness;
      newCell.age = this.age;
      return newCell;
    }
  }

  // Initialize audio analysis
  const initializeAudio = async () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      dataArrayRef.current = dataArray;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  // Detect beats in the audio stream
  const detectBeat = (): boolean => {
    if (!analyserRef.current || !dataArrayRef.current) return false;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);

    // Focus on low frequencies (bass) for beat detection
    const bassRange = dataArrayRef.current.slice(0, 10); // First 10 bins (~0-200Hz)
    const bassSum = bassRange.reduce((sum, value) => sum + value, 0);
    const bassAvg = bassSum / bassRange.length;

    // Normalize to 0-1
    const normalizedBass = bassAvg / 255;

    // Detect a beat if the bass exceeds the threshold
    if (normalizedBass > beatThreshold) {
      lastBeatTimeRef.current = performance.now();
      return true;
    }

    return false;
  };

  // Update cell behavior on beats
  const updateCellOnBeat = (grid: Cell[][]): void => {
    const width = grid[0].length;
    const height = grid.length;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = grid[y][x];

        // Activate cells and change colors on beat
        if (Math.random() < 0.5) {
          cell.alive = true;
          cell.hue = (cell.hue + Math.random() * 360) % 360;
          cell.saturation = 70 + Math.random() * 30;
          cell.brightness = 50 + Math.random() * 50;
        }
      }
    }
  };

  const initializeGrid = (width: number, height: number): Cell[][] => {
    const grid: Cell[][] = new Array(height);
    for (let y = 0; y < height; y++) {
      grid[y] = new Array(width);
      for (let x = 0; x < width; x++) {
        grid[y][x] = new Cell(Math.random() < config.initialDensity);
      }
    }
    return grid;
  };

  const getNeighborStats = (
    grid: Cell[][],
    x: number,
    y: number
  ): {
    aliveCount: number;
    avgHue: number;
    avgSat: number;
    avgBright: number;
  } => {
    const width = grid[0].length;
    const height = grid.length;
    let aliveCount = 0;
    let avgHue = 0;
    let avgSat = 0;
    let avgBright = 0;
    let count = 0;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = (x + dx + width) % width;
        const ny = (y + dy + height) % height;
        const neighbor = grid[ny][nx];

        if (neighbor.alive) {
          aliveCount++;
          avgHue += neighbor.hue;
          avgSat += neighbor.saturation;
          avgBright += neighbor.brightness;
          count++;
        }
      }
    }

    return {
      aliveCount,
      avgHue: count > 0 ? avgHue / count : Math.random() * 360,
      avgSat: count > 0 ? avgSat / count : 70 + Math.random() * 30,
      avgBright: count > 0 ? avgBright / count : 50 + Math.random() * 50,
    };
  };

  const updateCell = (
    grid: Cell[][],
    nextGrid: Cell[][],
    x: number,
    y: number
  ): void => {
    const cell = grid[y][x];
    const { aliveCount, avgHue, avgSat, avgBright } = getNeighborStats(grid, x, y);
    const nextCell = nextGrid[y][x];

    if (cell.alive) {
      nextCell.alive = aliveCount === 2 || aliveCount === 3;
    } else {
      nextCell.alive = aliveCount === 3;
    }

    if (nextCell.alive) {
      if (Math.random() < config.colorMutationRate) {
        nextCell.hue = (avgHue + (Math.random() - 0.5) * 60 + 360) % 360;
        nextCell.saturation = Math.max(60, Math.min(100, avgSat + (Math.random() - 0.5) * 20));
        nextCell.brightness = Math.max(40, Math.min(100, avgBright + (Math.random() - 0.5) * 20));
      } else {
        nextCell.hue = (avgHue + (Math.random() - 0.5) * 10 + 360) % 360;
        nextCell.saturation = Math.max(60, Math.min(100, avgSat + (Math.random() - 0.5) * 5));
        nextCell.brightness = Math.max(40, Math.min(100, avgBright + (Math.random() - 0.5) * 5));
      }
      nextCell.age = cell.alive ? cell.age + 1 : 0;
    }
  };

  const updateGrid = (): void => {
    if (!gridRef.current || !nextGridRef.current) return;

    const width = gridRef.current[0].length;
    const height = gridRef.current.length;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        nextGridRef.current[y][x] = gridRef.current[y][x].clone();
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        updateCell(gridRef.current, nextGridRef.current, x, y);
      }
    }

    // Detect beats and update cells
    if (detectBeat()) {
      updateCellOnBeat(nextGridRef.current);
    }

    [gridRef.current, nextGridRef.current] = [nextGridRef.current, gridRef.current];
  };

  const drawGrid = (ctx: CanvasRenderingContext2D): void => {
    if (!gridRef.current) return;

    const width = gridRef.current[0].length;
    const height = gridRef.current.length;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = gridRef.current[y][x];
        if (cell.alive) {
          ctx.fillStyle = `hsla(${cell.hue}, ${cell.saturation}%, ${cell.brightness}%, ${0.8 + Math.min(cell.age / 100, 0.2)})`;
          ctx.fillRect(
            x * config.cellSize,
            y * config.cellSize,
            config.cellSize,
            config.cellSize
          );
        }
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastUpdate = 0;

    const width = Math.ceil(canvas.width / config.cellSize);
    const height = Math.ceil(canvas.height / config.cellSize);
    gridRef.current = initializeGrid(width, height);
    nextGridRef.current = initializeGrid(width, height);

    // Initialize audio
    initializeAudio();

    const render = (timestamp: number): void => {
      if (isRunning && timestamp - lastUpdate > config.updateInterval) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        updateGrid();
        drawGrid(ctx);
        lastUpdate = timestamp;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render(0);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isRunning, config]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;
    if (!canvas || !gridRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / config.cellSize);
    const y = Math.floor((e.clientY - rect.top) / config.cellSize);

    const radius = 5;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= radius) {
          const nx = (x + dx + gridRef.current[0].length) % gridRef.current[0].length;
          const ny = (y + dy + gridRef.current.length) % gridRef.current.length;
          const cell = gridRef.current[ny][nx];
          cell.alive = true;
          cell.hue = Math.random() * 360;
          cell.saturation = 70 + Math.random() * 30;
          cell.brightness = 50 + Math.random() * 50;
        }
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="rounded-lg overflow-hidden shadow-lg bg-black">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full"
          onClick={handleCanvasClick}
        />
      </div>
      <div className="mt-4 text-center">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
        >
          {isRunning ? 'Pause' : 'Resume'}
        </button>
        <div className="mt-2 text-sm text-gray-600">
          Click anywhere to create new life patterns
        </div>
      </div>
    </div>
  );
};

export default PsychedelicAutomata;