'use client';

// Image Mode Context - Controls whether images are displayed
// Desktop default: with images | Mobile default: without images

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type ImageMode = 'with-images' | 'without-images';

interface ImageModeContextType {
  imageMode: ImageMode;
  toggleImageMode: () => void;
  isWithImages: boolean;
  mounted: boolean;
}

const ImageModeContext = createContext<ImageModeContextType | undefined>(undefined);

const STORAGE_KEY = 'buzzing-image-mode';
const MOBILE_BREAKPOINT = 768;

function getDefaultMode(): ImageMode {
  if (typeof window === 'undefined') return 'without-images';

  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'with-images' || stored === 'without-images') {
    return stored;
  }

  // Default based on screen width
  return window.innerWidth < MOBILE_BREAKPOINT ? 'without-images' : 'with-images';
}

export function ImageModeProvider({ children }: { children: ReactNode }) {
  // Default to 'without-images' to avoid flash on mobile (SSR-safe)
  const [imageMode, setImageMode] = useState<ImageMode>('without-images');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setImageMode(getDefaultMode());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, imageMode);
    }
  }, [imageMode, mounted]);

  const toggleImageMode = () => {
    setImageMode(prev => prev === 'with-images' ? 'without-images' : 'with-images');
  };

  return (
    <ImageModeContext.Provider value={{
      imageMode,
      toggleImageMode,
      isWithImages: imageMode === 'with-images',
      mounted,
    }}>
      {children}
    </ImageModeContext.Provider>
  );
}

export function useImageMode() {
  const context = useContext(ImageModeContext);
  if (context === undefined) {
    throw new Error('useImageMode must be used within an ImageModeProvider');
  }
  return context;
}
