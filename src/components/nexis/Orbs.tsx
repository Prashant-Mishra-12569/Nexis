import { useEffect, useRef } from "react";

export function Orbs() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Handle resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // 3D Wave wireframe mesh parameters
    const cols = 28;
    const rows = 16;
    let time = 0;

    // Floating particles (dust/stars)
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      alpha: number;
      targetAlpha: number;
      pulseSpeed: number;
    }

    const particles: Particle[] = [];
    const particleCount = 40;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random(),
        targetAlpha: Math.random() * 0.7 + 0.1,
        pulseSpeed: 0.003 + Math.random() * 0.008,
      });
    }

    // Animation Loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.45; // ticking time

      const spacingX = width / (cols - 1);
      const spacingY = height / (rows - 1);

      // 1. Calculate Grid Points with undulation
      const grid: { x: number; y: number; z: number; opacity: number }[][] = [];

      for (let c = 0; c < cols; c++) {
        grid[c] = [];
        for (let r = 0; r < rows; r++) {
          const rawX = c * spacingX;
          const rawY = r * spacingY;

          // 3D undulation math (interference of sine and cosine waves)
          const z1 = Math.sin(c * 0.18 + time * 0.02) * Math.cos(r * 0.18 + time * 0.015);
          const z2 = Math.sin((c + r) * 0.1 + time * 0.01) * 0.5;
          const z = (z1 + z2) * 55; // amplitude

          // Add organic perspective distortion
          const x = rawX + Math.cos(r * 0.3 + time * 0.008) * 15;
          const y = rawY + Math.sin(c * 0.3 + time * 0.008) * 15 + z * 0.4;

          // Opacity based on depth/wave height
          const opacity = Math.max(0.02, Math.min(0.28, (z + 80) / 160));

          grid[c][r] = { x, y, z, opacity };
        }
      }

      // 2. Draw Grid Wireframe lines (Horizontal & Vertical)
      ctx.lineWidth = 0.6;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const current = grid[c][r];

          // Draw horizontal connection
          if (c < cols - 1) {
            const nextX = grid[c + 1][r];
            const avgOpacity = (current.opacity + nextX.opacity) * 0.5;
            
            ctx.strokeStyle = `rgba(0, 255, 157, ${avgOpacity * 0.5})`;
            ctx.beginPath();
            ctx.moveTo(current.x, current.y);
            ctx.lineTo(nextX.x, nextX.y);
            ctx.stroke();
          }

          // Draw vertical connection
          if (r < rows - 1) {
            const nextY = grid[c][r + 1];
            const avgOpacity = (current.opacity + nextY.opacity) * 0.5;

            ctx.strokeStyle = `rgba(0, 210, 255, ${avgOpacity * 0.45})`;
            ctx.beginPath();
            ctx.moveTo(current.x, current.y);
            ctx.lineTo(nextY.x, nextY.y);
            ctx.stroke();
          }
        }
      }

      // 3. Draw and update particles (twinkling star/dust overlay)
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        p.alpha += (p.targetAlpha - p.alpha) * p.pulseSpeed;
        if (Math.abs(p.alpha - p.targetAlpha) < 0.05) {
          p.targetAlpha = Math.random() * 0.75 + 0.1;
        }

        ctx.fillStyle = `rgba(0, 255, 157, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 bg-[#020806]">
      {/* WebGL-like Canvas shader for 3D continuous loop wireframe wave */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" />

      {/* Pulsing Neon Green Corner Spotlights */}
      <div
        className="absolute rounded-full animate-[pulse_6s_ease-in-out_infinite]"
        style={{
          width: 800,
          height: 800,
          background: "radial-gradient(circle, rgba(0,255,157,0.18) 0%, rgba(0,255,157,0) 70%)",
          top: -200,
          right: -200,
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute rounded-full animate-[pulse_8s_ease-in-out_infinite]"
        style={{
          width: 750,
          height: 750,
          background: "radial-gradient(circle, rgba(0,255,157,0.14) 0%, rgba(0,255,157,0) 70%)",
          bottom: -220,
          left: -220,
          filter: "blur(60px)",
          animationDelay: "-3s",
        }}
      />
      
      {/* Overlay grid mesh pattern */}
      <div className="absolute inset-0 grid-bg opacity-[0.2]" />
    </div>
  );
}
