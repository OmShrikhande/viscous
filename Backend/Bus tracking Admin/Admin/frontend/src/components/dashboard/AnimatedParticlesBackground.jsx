import React, { useRef, useEffect } from 'react';

const AnimatedParticlesBackground = ({
  particleCount = 60,
  maxDistance = 140,
  style = {},
  className = '',
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let animationId;
    const particles = [];
    const mouse = { x: null, y: null };

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    }

    window.addEventListener('resize', resize);

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = 2 + Math.random() * 2.5;
        // Use a color that blends with the dashboard (indigo/blue with alpha)
        this.color = `rgba(99,102,241,${0.18 + Math.random() * 0.22})`;
        this.vx = (Math.random() - 0.5) * 1.2;
        this.vy = (Math.random() - 0.5) * 1.2;
      }
      draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = "#6366f1";
        ctx.shadowBlur = 12; // More blur for glow
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Mouse interaction
    canvas.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
    canvas.addEventListener('mouseleave', () => {
      mouse.x = null;
      mouse.y = null;
    });

    function drawLines() {
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDistance) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            // Indigo line with glow and transparency
            ctx.strokeStyle = `rgba(99,102,241,${0.13 + 0.5 * (1 - dist / maxDistance)})`;
            ctx.lineWidth = 1.2;
            ctx.shadowColor = "#6366f1";
            ctx.shadowBlur = 8;
            ctx.globalAlpha = 0.7;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            ctx.restore();
          }
        }
        // Draw line to mouse if close
        if (mouse.x !== null && mouse.y !== null) {
          const dx = particles[i].x - mouse.x;
          const dy = particles[i].y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDistance) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            // Pink accent for mouse interaction
            ctx.strokeStyle = `rgba(236,72,153,${0.18 + 0.6 * (1 - dist / maxDistance)})`;
            ctx.lineWidth = 1.7;
            ctx.shadowColor = "#ec4899";
            ctx.shadowBlur = 10;
            ctx.globalAlpha = 0.8;
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            ctx.restore();
          }
        }
      }
    }

    function animate() {
      // Use a transparent dark fill for trailing effect
      ctx.fillStyle = "rgba(17,24,39,0.38)";
      ctx.fillRect(0, 0, width, height);
      for (let p of particles) {
        p.update();
        p.draw();
      }
      drawLines();
      animationId = requestAnimationFrame(animate);
    }

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [particleCount, maxDistance]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full z-0 pointer-events-auto ${className}`}
      style={{ opacity: 0.38, ...style, background: "transparent" }}
    />
  );
};

export default AnimatedParticlesBackground;