import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Chip,
  Stack,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PhotoCamera as CameraIcon,
  PlayArrow as StartIcon,
  Check as CompleteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { db } from '../db';
import type { SupportEvent, SupportEventFormData, EventType, EventStatus } from '../types';

const eventTypes: { value: EventType; label: string }[] = [
  { value: 'acr_test', label: 'ACR Test' },
  { value: 'qc_check', label: 'QC Check' },
  { value: 'acceptance_test', label: 'Acceptance Test' },
  { value: 'annual_survey', label: 'Annual Survey' },
  { value: 'repair', label: 'Repair' },
  { value: 'calibration', label: 'Calibration' },
  { value: 'incident', label: 'Incident' },
  { value: 'service_call', label: 'Service Call' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'other', label: 'Other' },
];

const statusOptions: { value: EventStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const emptyForm: SupportEventFormData = {
  equipmentId: '',
  locationId: '',
  type: 'qc_check',
  status: 'scheduled',
  title: '',
  description: '',
  scheduledDate: undefined,
  startedAt: undefined,
  completedAt: undefined,
  findings: '',
  recommendations: '',
};

export default function Events() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const equipmentFilter = searchParams.get('equipment');

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SupportEventFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  const locations = useLiveQuery(() => db.locations.orderBy('name').toArray());
  const equipment = useLiveQuery(() => db.equipment.orderBy('name').toArray());
  const events = useLiveQuery(() => db.events.orderBy('createdAt').reverse().toArray());

  const imageCounts = useLiveQuery(async () => {
    const images = await db.images.toArray();
    const counts: Record<string, number> = {};
    images.forEach((img) => {
      if (img.eventId) {
        counts[img.eventId] = (counts[img.eventId] || 0) + 1;
      }
    });
    return counts;
  });

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    let filtered = events;
    if (equipmentFilter) {
      filtered = filtered.filter((e) => e.equipmentId === equipmentFilter);
    }
    // Filter by tab
    switch (tabValue) {
      case 1: // Scheduled
        return filtered.filter((e) => e.status === 'scheduled');
      case 2: // In Progress
        return filtered.filter((e) => e.status === 'in_progress');
      case 3: // Completed
        return filtered.filter((e) => e.status === 'completed');
      default: // All
        return filtered;
    }
  }, [events, equipmentFilter, tabValue]);

  const getEquipmentName = (equipmentId: string) => {
    return equipment?.find((e) => e.id === equipmentId)?.name || 'Unknown';
  };

  const getLocationName = (locationId: string) => {
    return locations?.find((l) => l.id === locationId)?.name || 'Unknown';
  };

  const handleOpen = (event?: SupportEvent) => {
    if (event) {
      setEditingId(event.id);
      setFormData({
        equipmentId: event.equipmentId,
        locationId: event.locationId,
        type: event.type,
        status: event.status,
        title: event.title,
        description: event.description || '',
        scheduledDate: event.scheduledDate,
        startedAt: event.startedAt,
        completedAt: event.completedAt,
        findings: event.findings || '',
        recommendations: event.recommendations || '',
      });
    } else {
      setEditingId(null);
      const eqId = equipmentFilter || '';
      const eq = equipment?.find((e) => e.id === eqId);
      setFormData({
        ...emptyForm,
        equipmentId: eqId,
        locationId: eq?.locationId || '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name as string]: value }));
  };

  const handleEquipmentChange = (equipmentId: string) => {
    const eq = equipment?.find((e) => e.id === equipmentId);
    setFormData((prev) => ({
      ...prev,
      equipmentId,
      locationId: eq?.locationId || prev.locationId,
    }));
  };

  const handleSave = async () => {
    const now = new Date();
    if (editingId) {
      await db.events.update(editingId, {
        ...formData,
        updatedAt: now,
      });
    } else {
      const newEvent: SupportEvent = {
        id: uuidv4(),
        ...formData,
        createdAt: now,
        updatedAt: now,
      };
      await db.events.add(newEvent);
    }
    handleClose();
  };

  const handleDelete = async (id: string) => {
    await db.events.delete(id);
    await db.images.where('eventId').equals(id).delete();
    await db.timelines.where('eventId').equals(id).delete();
    setDeleteConfirm(null);
  };

  const handleStartEvent = async (event: SupportEvent) => {
    await db.events.update(event.id, {
      status: 'in_progress',
      startedAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const handleCompleteEvent = async (event: SupportEvent) => {
    await db.events.update(event.id, {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'scheduled':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTypeLabel = (type: EventType) => {
    return eventTypes.find((t) => t.value === type)?.label || type;
  };

  return (
    <Box>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
      >
        <Box>
          <Typography variant="h4">Events</Typography>
          {equipmentFilter && (
            <Chip
              label={`Filtered: ${getEquipmentName(equipmentFilter)}`}
              onDelete={() => navigate('/events')}
              size="small"
              sx={{ mt: 1 }}
            />
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          disabled={!equipment || equipment.length === 0}
        >
          Add Event
        </Button>
      </Box>

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="All" />
        <Tab label="Scheduled" />
        <Tab label="In Progress" />
        <Tab label="Completed" />
      </Tabs>

      {(!equipment || equipment.length === 0) && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            Add equipment first before creating events.
          </Typography>
          <Button sx={{ mt: 2 }} onClick={() => navigate('/equipment')}>
            Go to Equipment
          </Button>
        </Box>
      )}

      <Grid container spacing={3}>
        {filteredEvents.map((event) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={event.id}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 1,
                  }}
                >
                  <Chip label={getTypeLabel(event.type)} size="small" variant="outlined" />
                  <Chip
                    label={event.status.replace('_', ' ')}
                    size="small"
                    color={getStatusColor(event.status)}
                  />
                </Box>
                <Typography variant="h6" gutterBottom>
                  {event.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {getEquipmentName(event.equipmentId)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  @ {getLocationName(event.locationId)}
                </Typography>
                {event.scheduledDate && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Scheduled: {format(event.scheduledDate, 'MMM d, yyyy')}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Chip
                    icon={<CameraIcon />}
                    label={`${imageCounts?.[event.id] || 0} Photos`}
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/gallery?event=${event.id}`)}
                  />
                </Stack>
              </CardContent>
              <CardActions>
                {event.status === 'scheduled' && (
                  <IconButton
                    size="small"
                    onClick={() => handleStartEvent(event)}
                    title="Start Event"
                  >
                    <StartIcon />
                  </IconButton>
                )}
                {event.status === 'in_progress' && (
                  <IconButton
                    size="small"
                    onClick={() => handleCompleteEvent(event)}
                    title="Complete Event"
                  >
                    <CompleteIcon />
                  </IconButton>
                )}
                <IconButton size="small" onClick={() => handleOpen(event)}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" onClick={() => setDeleteConfirm(event.id)}>
                  <DeleteIcon />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => navigate(`/gallery?event=${event.id}`)}
                  title="Add Photos"
                >
                  <CameraIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredEvents.length === 0 && equipment && equipment.length > 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No events found.</Typography>
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Event' : 'Add Event'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Equipment</InputLabel>
              <Select
                name="equipmentId"
                value={formData.equipmentId}
                label="Equipment"
                onChange={(e) => handleEquipmentChange(e.target.value)}
              >
                {equipment?.map((eq) => (
                  <MenuItem key={eq.id} value={eq.id}>
                    {eq.name} ({locations?.find((l) => l.id === eq.locationId)?.name})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Event Type</InputLabel>
              <Select
                name="type"
                value={formData.type}
                label="Event Type"
                onChange={(e) => handleChange(e as React.ChangeEvent<HTMLInputElement>)}
              >
                {eventTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              name="title"
              label="Title"
              value={formData.title}
              onChange={handleChange}
              required
              fullWidth
              placeholder="e.g., Monthly QC Check"
            />
            <TextField
              name="description"
              label="Description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              name="scheduledDate"
              label="Scheduled Date"
              type="date"
              value={formData.scheduledDate ? format(formData.scheduledDate, 'yyyy-MM-dd') : ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  scheduledDate: e.target.value ? new Date(e.target.value) : undefined,
                }))
              }
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={formData.status}
                label="Status"
                onChange={(e) => handleChange(e as React.ChangeEvent<HTMLInputElement>)}
              >
                {statusOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              name="findings"
              label="Findings"
              value={formData.findings}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              placeholder="Document any issues or observations..."
            />
            <TextField
              name="recommendations"
              label="Recommendations"
              value={formData.recommendations}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.title || !formData.equipmentId}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Event?</DialogTitle>
        <DialogContent>
          <Typography>
            This will also delete all photos and timelines associated with this event. This action
            cannot be undone.
          </Typography>
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
