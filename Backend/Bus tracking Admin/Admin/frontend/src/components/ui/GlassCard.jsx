import React from 'react';

const GlassCard = ({ 
  children, 
  className = '', 
  variant = 'default',
  hover = true,
  glow = false 
}) => {
  const getVariantStyles = () => {
    const baseStyles = "backdrop-blur-xl border shadow-2xl transition-all duration-300";
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} bg-white/25 border-white/40 ${hover ? 'hover:bg-white/35 hover:scale-105' : ''}`;
      case 'secondary':
        return `${baseStyles} bg-white/15 border-white/25 ${hover ? 'hover:bg-white/25' : ''}`;
      case 'dark':
        return `${baseStyles} bg-black/30 border-white/20 ${hover ? 'hover:bg-black/40' : ''}`;
      case 'success':
        return `${baseStyles} bg-green-500/20 border-green-400/40 ${hover ? 'hover:bg-green-500/30' : ''}`;
      case 'warning':
        return `${baseStyles} bg-yellow-500/20 border-yellow-400/40 ${hover ? 'hover:bg-yellow-500/30' : ''}`;
      case 'error':
        return `${baseStyles} bg-red-500/20 border-red-400/40 ${hover ? 'hover:bg-red-500/30' : ''}`;
      case 'info':
        return `${baseStyles} bg-blue-500/20 border-blue-400/40 ${hover ? 'hover:bg-blue-500/30' : ''}`;
      default:
        return `${baseStyles} bg-white/20 border-white/30 ${hover ? 'hover:bg-white/30 hover:scale-105' : ''}`;
    }
  };

  const glowStyles = glow ? 'shadow-[0_0_30px_rgba(255,255,255,0.1)]' : '';

  return (
    <div className={`${getVariantStyles()} ${glowStyles} ${className}`}>
      {children}
    </div>
  );
};

export default GlassCard;