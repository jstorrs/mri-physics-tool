import { useState, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Typography,
  Chip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ImageList,
  ImageListItem,
  ImageListItemBar,
} from '@mui/material';
import {
  PhotoCamera as CameraIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { db } from '../db';
import type { GalleryImage } from '../types';

async function createThumbnail(blob: Blob, maxSize = 200): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.7);
    };
    img.src = URL.createObjectURL(blob);
  });
}

export default function Gallery() {
  const [searchParams] = useSearchParams();
  const eventFilter = searchParams.get('event');

  const [cameraOpen, setCameraOpen] = useState(false);
  const [viewImage, setViewImage] = useState<GalleryImage | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(eventFilter || '');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const events = useLiveQuery(() => db.events.orderBy('createdAt').reverse().toArray());

  const images = useLiveQuery(async () => {
    let query = db.images.orderBy('capturedAt').reverse();
    const allImages = await query.toArray();
    if (eventFilter) {
      return allImages.filter((img) => img.eventId === eventFilter);
    }
    return allImages;
  }, [eventFilter]);

  const getEventTitle = (eventId?: string) => {
    if (!eventId) return 'No Event';
    const event = events?.find((e) => e.id === eventId);
    return event?.title || 'Unknown Event';
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraOpen(true);
    } catch (err) {
      console.error('Failed to access camera:', err);
      alert('Could not access camera. Please check permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const thumbnail = await createThumbnail(blob);
      const event = events?.find((e) => e.id === selectedEvent);

      const image: GalleryImage = {
        id: uuidv4(),
        eventId: selectedEvent || undefined,
        equipmentId: event?.equipmentId,
        locationId: event?.locationId,
        filename: `photo_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        blob,
        thumbnailBlob: thumbnail,
        caption: caption || undefined,
        capturedAt: new Date(),
        createdAt: new Date(),
      };

      await db.images.add(image);
      setCaption('');
    }, 'image/jpeg', 0.9);
  }, [selectedEvent, caption, events]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const event = events?.find((ev) => ev.id === selectedEvent);

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;

        const thumbnail = await createThumbnail(file);

        const image: GalleryImage = {
          id: uuidv4(),
          eventId: selectedEvent || undefined,
          equipmentId: event?.equipmentId,
          locationId: event?.locationId,
          filename: file.name,
          mimeType: file.type,
          blob: file,
          thumbnailBlob: thumbnail,
          capturedAt: new Date(),
          createdAt: new Date(),
        };

        await db.images.add(image);
      }

      e.target.value = '';
    },
    [selectedEvent, events]
  );

  const handleDelete = async (id: string) => {
    await db.images.delete(id);
    setDeleteConfirm(null);
    if (viewImage?.id === id) {
      setViewImage(null);
    }
  };

  const updateCaption = async (id: string, newCaption: string) => {
    await db.images.update(id, { caption: newCaption || undefined });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Gallery</Typography>
          {eventFilter && (
            <Chip
              label={`Event: ${getEventTitle(eventFilter)}`}
              size="small"
              sx={{ mt: 1 }}
            />
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => fileInputRef.current?.click()}>
            Upload
          </Button>
          <Button variant="contained" startIcon={<CameraIcon />} onClick={startCamera}>
            Camera
          </Button>
        </Stack>
      </Box>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        multiple
        onChange={handleFileUpload}
      />

      {/* Event filter for new photos */}
      <Box sx={{ mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 300 }}>
          <InputLabel>Associate photos with event</InputLabel>
          <Select
            value={selectedEvent}
            label="Associate photos with event"
            onChange={(e) => setSelectedEvent(e.target.value)}
          >
            <MenuItem value="">No event</MenuItem>
            {events?.map((event) => (
              <MenuItem key={event.id} value={event.id}>
                {event.title} ({format(event.createdAt, 'MMM d')})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Image Grid */}
      {images && images.length > 0 ? (
        <ImageList cols={4} gap={8} sx={{ width: '100%' }}>
          {images.map((image) => (
            <ImageListItem key={image.id} sx={{ cursor: 'pointer' }}>
              <img
                src={URL.createObjectURL(image.thumbnailBlob || image.blob)}
                alt={image.caption || image.filename}
                loading="lazy"
                onClick={() => setViewImage(image)}
                style={{ borderRadius: 4 }}
              />
              <ImageListItemBar
                title={image.caption || format(image.capturedAt, 'MMM d, h:mm a')}
                subtitle={getEventTitle(image.eventId)}
                actionIcon={
                  <IconButton
                    sx={{ color: 'rgba(255, 255, 255, 0.54)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(image.id);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              />
            </ImageListItem>
          ))}
        </ImageList>
      ) : (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">
            No images yet. Use the camera or upload photos to get started.
          </Typography>
        </Box>
      )}

      {/* Camera Dialog */}
      <Dialog open={cameraOpen} onClose={stopCamera} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Capture Photo
            <IconButton onClick={stopCamera}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: '100%', borderRadius: 8, background: '#000' }}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Associate with event</InputLabel>
              <Select
                value={selectedEvent}
                label="Associate with event"
                onChange={(e) => setSelectedEvent(e.target.value)}
              >
                <MenuItem value="">No event</MenuItem>
                {events?.map((event) => (
                  <MenuItem key={event.id} value={event.id}>
                    {event.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={stopCamera}>Close</Button>
          <Button variant="contained" onClick={capturePhoto} startIcon={<CameraIcon />}>
            Capture
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={!!viewImage} onClose={() => setViewImage(null)} maxWidth="lg" fullWidth>
        {viewImage && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {format(viewImage.capturedAt, 'MMM d, yyyy h:mm a')}
                <IconButton onClick={() => setViewImage(null)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <img
                  src={URL.createObjectURL(viewImage.blob)}
                  alt={viewImage.caption || viewImage.filename}
                  style={{ width: '100%', borderRadius: 8 }}
                />
                <TextField
                  label="Caption"
                  value={viewImage.caption || ''}
                  onChange={(e) => {
                    setViewImage({ ...viewImage, caption: e.target.value });
                  }}
                  onBlur={() => updateCaption(viewImage.id, viewImage.caption || '')}
                  fullWidth
                />
                {viewImage.eventId && (
                  <Typography variant="body2" color="text.secondary">
                    Event: {getEventTitle(viewImage.eventId)}
                  </Typography>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button color="error" onClick={() => setDeleteConfirm(viewImage.id)}>
                Delete
              </Button>
              <Button onClick={() => setViewImage(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Image?</DialogTitle>
        <DialogContent>
          <Typography>This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
