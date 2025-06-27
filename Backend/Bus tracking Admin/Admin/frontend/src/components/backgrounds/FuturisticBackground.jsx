import React, { useEffect, useRef } from 'react';

const FuturisticBackground = ({ variant = 'default', children }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Particle system based on variant
    const createParticles = () => {
      particles = [];
      const particleCount = variant === 'analytics' ? 150 : variant === 'users' ? 100 : 80;
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.8 + 0.2,
          hue: getVariantHue(),
          life: Math.random() * 100
        });
      }
    };

    const getVariantHue = () => {
      switch (variant) {
        case 'users': return 220 + Math.random() * 40; // Blue spectrum
        case 'analytics': return 280 + Math.random() * 40; // Purple spectrum
        case 'reports': return 120 + Math.random() * 40; // Green spectrum
        case 'settings': return 30 + Math.random() * 40; // Orange spectrum
        case 'attendance': return 180 + Math.random() * 40; // Cyan spectrum
        default: return 240 + Math.random() * 60; // Blue-purple spectrum
      }
    };

    const drawGeometricShapes = () => {
      ctx.save();
      ctx.globalAlpha = 0.1;
      
      // Rotating hexagons
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.translate(
          (canvas.width / 6) * (i + 1) + Math.sin(time * 0.001 + i) * 50,
          canvas.height / 2 + Math.cos(time * 0.0015 + i) * 100
        );
        ctx.rotate(time * 0.002 + i);
        
        ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const angle = (j * Math.PI) / 3;
          const x = Math.cos(angle) * (50 + i * 20);
          const y = Math.sin(angle) * (50 + i * 20);
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        
        const hue = getVariantHue();
        ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
      
      ctx.restore();
    };

    const drawParticles = () => {
      particles.forEach((particle, index) => {
        // Update particle
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life += 1;
        
        // Wrap around screen
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
        
        // Pulsing effect
        const pulse = Math.sin(particle.life * 0.05) * 0.5 + 0.5;
        
        // Draw particle
        ctx.save();
        ctx.globalAlpha = particle.opacity * pulse;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${particle.hue}, 70%, 60%)`;
        ctx.fill();
        
        // Add glow effect
        ctx.shadowColor = `hsl(${particle.hue}, 70%, 60%)`;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      });
    };

    const drawConnections = () => {
      ctx.save();
      ctx.globalAlpha = 0.3;
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsl(${particles[i].hue}, 70%, 60%)`;
            ctx.lineWidth = (150 - distance) / 150;
            ctx.stroke();
          }
        }
      }
      
      ctx.restore();
    };

    const drawWavePattern = () => {
      ctx.save();
      ctx.globalAlpha = 0.2;
      
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        
        for (let x = 0; x <= canvas.width; x += 10) {
          const y = canvas.height / 2 + 
            Math.sin((x * 0.01) + (time * 0.005) + (i * 2)) * (50 + i * 30) +
            Math.sin((x * 0.02) + (time * 0.003) + (i * 1.5)) * (20 + i * 10);
          ctx.lineTo(x, y);
        }
        
        const hue = getVariantHue() + i * 20;
        ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.restore();
    };

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 20, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      time += 16;
      
      drawWavePattern();
      drawGeometricShapes();
      drawParticles();
      drawConnections();
      
      animationId = requestAnimationFrame(animate);
    };

    createParticles();
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [variant]);

  const getGradientClass = () => {
    switch (variant) {
      case 'users':
        return 'from-blue-900 via-indigo-900 to-purple-900';
      case 'analytics':
        return 'from-purple-900 via-pink-900 to-red-900';
      case 'reports':
        return 'from-green-900 via-teal-900 to-blue-900';
      case 'settings':
        return 'from-orange-900 via-red-900 to-pink-900';
      case 'attendance':
        return 'from-cyan-900 via-blue-900 to-indigo-900';
      default:
        return 'from-gray-900 via-blue-900 to-indigo-900';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getGradientClass()} relative`} style={{ minHeight: '100vh' }}>
      {/* Background Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Overlay gradient */}
      <div className="fixed top-0 left-0 w-full h-full bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none z-0" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default FuturisticBackground;