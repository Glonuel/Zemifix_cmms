import React from 'react';

interface LogoProps {
  variant?: 'light' | 'dark' | 'icon';
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Official ZemiFix brand assets supplied by the project supervisor.
 * dark  = white wordmark on the official navy background (for the sidebar)
 * light = navy wordmark on white (for light pages such as login)
 * icon  = official square Z/check mark
 */
export const Logo: React.FC<LogoProps> = ({
  variant = 'dark',
  width,
  height,
  className = '',
}) => {
  if (variant === 'icon') {
    const size = width ?? 36;
    return (
      <img
        src="/brand/zemifix-icon.jpeg"
        alt="ZemiFix"
        width={size}
        height={size}
        className={`inline-block shrink-0 rounded-lg object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const w = width ?? 150;
  const h = height ?? 58;
  const src = variant === 'dark'
    ? '/brand/zemifix-wordmark-dark.jpeg'
    : '/brand/zemifix-wordmark-light.jpeg';

  return (
    <img
      src={src}
      alt="ZemiFix"
      width={w}
      height={h}
      className={`inline-block shrink-0 object-contain ${className}`}
      style={{ width: w, height: h }}
    />
  );
};
