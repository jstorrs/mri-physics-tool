import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCamera } from '../hooks/useCamera';

type CameraMode = 'INITIAL' | 'CROP' | 'PREVIEW';

const MAX_SCALE = 5;
const MAX_DIMENSION = 4096;
const JPEG_QUALITY = 0.92;
const CROP_HANDLE_HEIGHT = 30;

export default function Camera() {
  const navigate = useNavigate();

  // Mode state
  const [mode, setMode] = useState<CameraMode>('INITIAL');

  // Camera hook
  const { videoRef, error: cameraError, isReady, capture, stop, start } = useCamera({
    facingMode: 'environment',
    targetWidth: 1920,
    targetHeight: 1080,
  });

  // Captured image state
  const [capturedImage, setCapturedImage] = useState<HTMLImageElement | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  // Transform state for CROP mode
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);

  // Preview state
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [croppedDimensions, setCroppedDimensions] = useState<{ width: number; height: number } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Refs
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gesture state
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const initialPinchDistanceRef = useRef<number | null>(null);
  const baseScaleRef = useRef<number>(1);
  const lastTapRef = useRef<number>(0);

  // Crop handle dragging
  const isDraggingCropRef = useRef(false);
  const cropStartYRef = useRef(0);
  const cropInitialYRef = useRef(0);

  // Start camera on mount
  useEffect(() => {
    start();
    return () => stop();
  }, []);

  // Calculate min scale when image is set
  useEffect(() => {
    if (capturedImage && cropContainerRef.current) {
      const containerWidth = cropContainerRef.current.clientWidth;
      const imageWidth = rotation === 90 || rotation === 270 ? capturedImage.height : capturedImage.width;
      const calculatedMinScale = containerWidth / imageWidth;
      setMinScale(calculatedMinScale);
      setScale(calculatedMinScale);

      // Set initial crop to bottom of image
      const imageHeight = rotation === 90 || rotation === 270 ? capturedImage.width : capturedImage.height;
      setCropY(imageHeight * calculatedMinScale);
    }
  }, [capturedImage, rotation]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleBack = useCallback(() => {
    stop();
    navigate(-1);
  }, [navigate, stop]);

  const handleCapture = useCallback(async () => {
    const img = await capture();
    if (img) {
      setCapturedImage(img);
      setImageDataUrl(img.src);
      setMode('CROP');
      stop();
    }
  }, [capture, stop]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setCapturedImage(img);
        setImageDataUrl(img.src);
        setMode('CROP');
        stop();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [stop]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    setImageDataUrl(null);
    setCroppedBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setRotation(0);
    setScale(1);
    setOffsetX(0);
    setOffsetY(0);
    setMode('INITIAL');
    start();
  }, [start, previewUrl]);

  const handleRotate = useCallback(() => {
    setRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270);
  }, []);

  const handleDone = useCallback(async () => {
    if (!capturedImage || !cropContainerRef.current) return;

    // Create cropped image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate visible area based on current transform
    const containerHeight = cropContainerRef.current.clientHeight;
    const containerWidth = cropContainerRef.current.clientWidth;

    // For now, simple crop to the cropY line
    const sourceWidth = capturedImage.width;
    const sourceHeight = capturedImage.height;

    // Calculate crop region in source image coordinates
    const visibleHeight = Math.min(cropY / scale, sourceHeight);

    canvas.width = sourceWidth;
    canvas.height = visibleHeight;

    // Handle rotation
    if (rotation === 0) {
      ctx.drawImage(capturedImage, 0, 0, sourceWidth, visibleHeight, 0, 0, sourceWidth, visibleHeight);
    } else {
      // Apply rotation
      ctx.save();
      if (rotation === 90) {
        canvas.width = visibleHeight;
        canvas.height = sourceWidth;
        ctx.translate(canvas.width, 0);
        ctx.rotate(Math.PI / 2);
      } else if (rotation === 180) {
        ctx.translate(canvas.width, canvas.height);
        ctx.rotate(Math.PI);
      } else if (rotation === 270) {
        canvas.width = visibleHeight;
        canvas.height = sourceWidth;
        ctx.translate(0, canvas.height);
        ctx.rotate(-Math.PI / 2);
      }
      ctx.drawImage(capturedImage, 0, 0, sourceWidth, visibleHeight, 0, 0, sourceWidth, visibleHeight);
      ctx.restore();
    }

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCroppedBlob(blob);
          setCroppedDimensions({ width: canvas.width, height: canvas.height });
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
          }
          setPreviewUrl(URL.createObjectURL(blob));
          setMode('PREVIEW');
        }
      },
      'image/jpeg',
      JPEG_QUALITY
    );
  }, [capturedImage, cropY, scale, rotation, previewUrl]);

  const handleSave = useCallback(() => {
    if (croppedBlob) {
      console.log('Saving image:', {
        blob: croppedBlob,
        size: croppedBlob.size,
        dimensions: croppedDimensions,
      });
      // TODO: Integrate with db.images.add()
      navigate(-1);
    }
  }, [croppedBlob, croppedDimensions, navigate]);

  // Touch handlers for CROP mode
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (mode !== 'CROP') return;

    if (e.touches.length === 1) {
      // Check for double-tap
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double-tap: reset zoom
        setScale(minScale);
        setOffsetX(0);
        setOffsetY(0);
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      // Single touch - start pan
      touchStartRef.current = {
        x: e.touches[0].clientX - offsetX,
        y: e.touches[0].clientY - offsetY,
      };
    } else if (e.touches.length === 2) {
      // Pinch start
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      initialPinchDistanceRef.current = Math.hypot(dx, dy);
      baseScaleRef.current = scale;
      touchStartRef.current = null;
    }
  }, [mode, minScale, scale, offsetX, offsetY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (mode !== 'CROP') return;
    e.preventDefault();

    if (e.touches.length === 1 && touchStartRef.current) {
      // Pan
      const newOffsetX = e.touches[0].clientX - touchStartRef.current.x;
      const newOffsetY = e.touches[0].clientY - touchStartRef.current.y;
      setOffsetX(newOffsetX);
      setOffsetY(newOffsetY);
    } else if (e.touches.length === 2 && initialPinchDistanceRef.current) {
      // Pinch zoom
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const distance = Math.hypot(dx, dy);
      const scaleDelta = distance / initialPinchDistanceRef.current;
      const newScale = Math.min(MAX_SCALE, Math.max(minScale, baseScaleRef.current * scaleDelta));
      setScale(newScale);
    }
  }, [mode, minScale]);

  const handleTouchEnd = useCallback(() => {
    touchStartRef.current = null;
    initialPinchDistanceRef.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (mode !== 'CROP') return;
    e.preventDefault();

    const delta = -e.deltaY * 0.001;
    const newScale = Math.min(MAX_SCALE, Math.max(minScale, scale + delta));
    setScale(newScale);
  }, [mode, minScale, scale]);

  // Crop handle handlers
  const handleCropHandleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingCropRef.current = true;
    cropStartYRef.current = e.clientY;
    cropInitialYRef.current = cropY;
    e.preventDefault();
  }, [cropY]);

  const handleCropHandleTouchStart = useCallback((e: React.TouchEvent) => {
    isDraggingCropRef.current = true;
    cropStartYRef.current = e.touches[0].clientY;
    cropInitialYRef.current = cropY;
    e.stopPropagation();
  }, [cropY]);

  // Global mouse/touch move for crop handle
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingCropRef.current) return;
      const delta = e.clientY - cropStartYRef.current;
      const newCropY = Math.max(50, cropInitialYRef.current + delta);
      setCropY(newCropY);
    };

    const handleMouseUp = () => {
      isDraggingCropRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingCropRef.current) return;
      const delta = e.touches[0].clientY - cropStartYRef.current;
      const newCropY = Math.max(50, cropInitialYRef.current + delta);
      setCropY(newCropY);
    };

    const handleTouchEnd = () => {
      isDraggingCropRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'CROP') {
        switch (e.key) {
          case 'Escape':
            handleRetake();
            break;
          case 'Enter':
            handleDone();
            break;
          case 'r':
          case 'R':
            handleRotate();
            break;
          case 'ArrowUp':
            setCropY((y) => Math.max(50, y - (e.shiftKey ? 50 : 10)));
            break;
          case 'ArrowDown':
            setCropY((y) => y + (e.shiftKey ? 50 : 10));
            break;
          case 'Home':
            setCropY(50);
            break;
        }
      } else if (mode === 'PREVIEW') {
        switch (e.key) {
          case 'Escape':
            handleRetake();
            break;
          case 'Enter':
            handleSave();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleRetake, handleDone, handleRotate, handleSave]);

  // Calculate image dimensions for display
  const getImageDimensions = () => {
    if (!capturedImage) return { width: 0, height: 0 };
    if (rotation === 90 || rotation === 270) {
      return { width: capturedImage.height, height: capturedImage.width };
    }
    return { width: capturedImage.width, height: capturedImage.height };
  };

  return (
    <>
      {/* INITIAL MODE - Viewfinder */}
      {mode === 'INITIAL' && (
        <div className="camera-viewfinder">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-video"
          />

          {cameraError && (
            <div className="camera-error">
              <p>{cameraError}</p>
              <label className="btn btn--primary camera-file-label">
                Select Photo
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="visually-hidden"
                />
              </label>
            </div>
          )}

          <div className="camera-controls">
            <button className="btn camera-back" onClick={handleBack}>
              Cancel
            </button>
            <button
              className="camera-capture"
              onClick={handleCapture}
              disabled={!isReady}
              aria-label="Take photo"
            />
            <div className="camera-spacer" />
          </div>
        </div>
      )}

      {/* CROP MODE */}
      {mode === 'CROP' && imageDataUrl && (
        <div
          className="camera-crop"
          ref={cropContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          {/* Transformed image */}
          <div
            className="camera-crop__image-container"
            style={{
              transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'top left',
            }}
          >
            <img src={imageDataUrl} alt="Captured" draggable={false} />
          </div>

          {/* Crop overlay (darkened area below crop line) */}
          <div
            className="camera-crop__overlay"
            style={{ top: `${cropY}px` }}
          />

          {/* Crop handle */}
          <div
            className="camera-crop__handle"
            style={{ top: `${cropY}px` }}
            onMouseDown={handleCropHandleMouseDown}
            onTouchStart={handleCropHandleTouchStart}
            role="slider"
            aria-label="Crop position"
            aria-valuemin={0}
            aria-valuenow={cropY}
            tabIndex={0}
          >
            <div className="camera-crop__handle-bar" />
          </div>

          {/* Zoom indicator */}
          <div className="camera-crop__zoom-info">
            {scale.toFixed(1)}x
          </div>

          {/* Controls */}
          <div className="camera-crop__controls">
            <button className="btn" onClick={handleRetake}>
              Retake
            </button>
            <button className="btn" onClick={handleRotate}>
              Rotate
            </button>
            <button className="btn btn--primary" onClick={handleDone}>
              Done
            </button>
          </div>
        </div>
      )}

      {/* PREVIEW MODE */}
      {mode === 'PREVIEW' && previewUrl && (
        <div className="camera-preview">
          <img
            src={previewUrl}
            alt="Preview"
            className="camera-preview__image"
          />

          <div className="camera-preview__info">
            <span>
              {croppedDimensions?.width} x {croppedDimensions?.height}
            </span>
            <span className="camera-preview__size">
              {croppedBlob ? `${(croppedBlob.size / 1024).toFixed(0)} KB` : ''}
            </span>
          </div>

          <div className="camera-preview__controls">
            <button className="btn" onClick={handleRetake}>
              Retake
            </button>
            <button className="btn btn--primary" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      )}
    </>
  );
}
