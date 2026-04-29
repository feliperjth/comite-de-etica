"use client";

import Image from "next/image";
import { useState } from "react";

interface LogoImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  fallback: string;
  className?: string;
}

export default function LogoImage({ src, alt, width, height, fallback, className }: LogoImageProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <span className="text-xs font-bold text-white/70 italic whitespace-nowrap">
        {fallback}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setError(true)}
    />
  );
}
