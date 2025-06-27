import React from 'react';

const FuturisticText = ({ 
  children, 
  variant = 'default',
  size = 'base',
  glow = false,
  className = ''
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'xs': return 'text-xs';
      case 'sm': return 'text-sm';
      case 'base': return 'text-base';
      case 'lg': return 'text-lg';
      case 'xl': return 'text-xl';
      case '2xl': return 'text-2xl';
      case '3xl': return 'text-3xl';
      case '4xl': return 'text-4xl';
      default: return 'text-base';
    }
  };

  const getVariantStyles = () => {
    const baseStyles = "font-medium";
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} text-gray-950 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`;
      case 'secondary':
        return `${baseStyles} text-gray-800 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]`;
      case 'accent':
        return `${baseStyles} text-blue-800 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`;
      case 'success':
        return `${baseStyles} text-green-800 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`;
      case 'warning':
        return `${baseStyles} text-yellow-800 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`;
      case 'error':
        return `${baseStyles} text-red-800 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`;
      case 'muted':
        return `${baseStyles} text-gray-800 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]`;
      default:
        return `${baseStyles} text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`;
    }
  };

  // const glowStyles = glow ? 'text-shadow: 0 0 4px currentColor;' : '';

  return (
    <span
      className={`${getSizeStyles()} ${getVariantStyles()} ${className}`}
      style={glow ? { textShadow: '0 0 2px currentColor' } : {}}
    >
      {children}
    </span>
  );
};

export default FuturisticText;