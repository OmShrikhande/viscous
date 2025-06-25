import { useEffect, useRef } from 'react';

const randomBetween = (min, max) => Math.random() * (max - min) + min;

const shapes = ['triangle', 'square', 'pentagon'];

const drawShape = (ctx, shape, x, y, size, color) => {
  ctx.beginPath();
  switch (shape) {
    case 'triangle':
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size, y + size);
      ctx.lineTo(x + size, y + size);
      ctx.closePath();
      break;
    case 'square':
      ctx.rect(x - size, y - size, size * 2, size * 2);
      break;
    case 'pentagon':
      for (let i = 0; i < 5; i++) {
        const angle = ((Math.PI * 2) / 5) * i - Math.PI / 2;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
  }
  ctx.fillStyle = color;
  ctx.fill();
};

const AnimatedBackground = () => {
  const canvasRef = useRef();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = (canvas.width = window.innerWidth);
    const h = (canvas.height = window.innerHeight);

    const particles = Array.from({ length: 25 }, () => ({
      x: randomBetween(0, w),
      y: randomBetween(0, h),
      size: randomBetween(10, 25),
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      dx: randomBetween(-0.5, 0.5),
      dy: randomBetween(0.2, 0.6),
      color: `hsla(${Math.random() * 360}, 70%, 80%, 0.3)`
    }));

    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        drawShape(ctx, p.shape, p.x, p.y, p.size, p.color);
        p.x += p.dx;
        p.y += p.dy;

        if (p.y > h + 50 || p.x < -50 || p.x > w + 50) {
          p.x = randomBetween(0, w);
          p.y = -50;
        }
      }
      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 z-0 pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};

export default AnimatedBackground;
