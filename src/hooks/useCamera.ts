import { useState, useRef, useCallback, useEffect } from 'react';

interface UseCameraOptions {
  facingMode?: 'environment' | 'user';
  targetWidth?: number;
  targetHeight?: number;
}

interface UseCameraResult {
  stream: MediaStream | null;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isReady: boolean;
  capture: () => Promise<HTMLImageElement | null>;
  stop: () => void;
  start: () => Promise<void>;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraResult {
  const {
    facingMode = 'environment',
    targetWidth = 1920,
    targetHeight = 1080,
  } = options;

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const stop = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsReady(false);
    }
  }, [stream]);

  const start = useCallback(async () => {
    setError(null);
    setIsReady(false);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: targetWidth },
          height: { ideal: targetHeight },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;

        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current;
          if (!video) {
            reject(new Error('Video element not found'));
            return;
          }

          const handleLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            resolve();
          };

          const handleError = () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('error', handleError);
            reject(new Error('Video failed to load'));
          };

          video.addEventListener('loadedmetadata', handleLoadedMetadata);
          video.addEventListener('error', handleError);
        });

        setIsReady(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access failed';

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is in use by another application.');
        } else {
          setError(message);
        }
      } else {
        setError(message);
      }
    }
  }, [facingMode, targetWidth, targetHeight]);

  const capture = useCallback(async (): Promise<HTMLImageElement | null> => {
    const video = videoRef.current;
    if (!video || !isReady) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = canvas.toDataURL('image/jpeg', 1.0);
    });
  }, [isReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return {
    stream,
    error,
    videoRef,
    isReady,
    capture,
    stop,
    start,
  };
}
