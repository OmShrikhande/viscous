import React, { useEffect, useRef } from 'react';

const AdminProfileBackground = ({ children }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let mistParticles = [];
    let emberParticles = [];
    let shadowShapes = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create mist particles (red mist)
    const createMist = () => {
      mistParticles = [];
      for (let i = 0; i < 40; i++) {
        mistParticles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: 120 + Math.random() * 100,
          alpha: 0.05 + Math.random() * 0.08,
          dx: (Math.random() - 0.5) * 0.3,
          dy: (Math.random() - 0.5) * 0.2,
          hue: 350 + Math.random() * 20 // Deep red
        });
      }
    };

    // Create ember particles (floating sparks)
    const createEmbers = () => {
      emberParticles = [];
      for (let i = 0; i < 60; i++) {
        emberParticles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.7,
          vy: -Math.random() * 1.2 - 0.2,
          size: Math.random() * 2 + 1,
          alpha: 0.6 + Math.random() * 0.3,
          life: Math.random() * 100,
          color: `hsl(${20 + Math.random() * 20}, 90%, 60%)` // Orange-red
        });
      }
    };

    // Create shadowy shapes (ghostly silhouettes)
    const createShadows = () => {
      shadowShapes = [];
      for (let i = 0; i < 6; i++) {
        shadowShapes.push({
          x: Math.random() * canvas.width,
          y: canvas.height - 100 - Math.random() * 200,
          width: 80 + Math.random() * 120,
          height: 120 + Math.random() * 100,
          alpha: 0.08 + Math.random() * 0.08,
          sway: Math.random() * Math.PI * 2,
          speed: 0.002 + Math.random() * 0.002
        });
      }
    };

    createMist();
    createEmbers();
    createShadows();

    // Draw mist
    const drawMist = () => {
      mistParticles.forEach(p => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < -p.radius) p.x = canvas.width + p.radius;
        if (p.x > canvas.width + p.radius) p.x = -p.radius;
        if (p.y < -p.radius) p.y = canvas.height + p.radius;
        if (p.y > canvas.height + p.radius) p.y = -p.radius;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, `hsl(${p.hue}, 80%, 40%)`);
        grad.addColorStop(1, 'rgba(30,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    };

    // Draw embers
    const drawEmbers = () => {
      emberParticles.forEach(e => {
        e.x += e.vx;
        e.y += e.vy;
        e.life += 1;
        if (e.y < -10) {
          e.x = Math.random() * canvas.width;
          e.y = canvas.height + 10;
          e.life = 0;
        }
        ctx.save();
        ctx.globalAlpha = e.alpha * (0.7 + 0.3 * Math.sin(e.life * 0.1));
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();
      });
    };

    // Draw shadowy shapes
    const drawShadows = () => {
      shadowShapes.forEach(s => {
        s.sway += s.speed;
        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.ellipse(
          s.x + Math.sin(s.sway) * 20,
          s.y + Math.cos(s.sway) * 10,
          s.width,
          s.height,
          0,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.filter = 'blur(6px)';
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep dark background
      ctx.fillStyle = 'rgb(10, 8, 18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawShadows();
      drawMist();
      drawEmbers();

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="min-h-screen relative">
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
        style={{ mixBlendMode: 'screen' }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default AdminProfileBackground;