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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { db } from '../db';
import type { Equipment, EquipmentFormData } from '../types';

const emptyForm: EquipmentFormData = {
  locationId: '',
  name: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  fieldStrength: '',
  installDate: undefined,
  softwareVersion: '',
  serviceContractExpiry: undefined,
  status: 'active',
  notes: '',
};

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'decommissioned', label: 'Decommissioned' },
];

const fieldStrengthOptions = ['1.5T', '3T', '7T', '0.5T', '1.0T', 'Other'];

export default function EquipmentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const locationFilter = searchParams.get('location');

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EquipmentFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const locations = useLiveQuery(() => db.locations.orderBy('name').toArray());
  const equipment = useLiveQuery(() => db.equipment.orderBy('name').toArray());

  const eventCounts = useLiveQuery(async () => {
    const events = await db.events.toArray();
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      counts[e.equipmentId] = (counts[e.equipmentId] || 0) + 1;
    });
    return counts;
  });

  const filteredEquipment = useMemo(() => {
    if (!equipment) return [];
    if (!locationFilter) return equipment;
    return equipment.filter((e) => e.locationId === locationFilter);
  }, [equipment, locationFilter]);

  const getLocationName = (locationId: string) => {
    return locations?.find((l) => l.id === locationId)?.name || 'Unknown';
  };

  const handleOpen = (item?: Equipment) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        locationId: item.locationId,
        name: item.name,
        manufacturer: item.manufacturer,
        model: item.model,
        serialNumber: item.serialNumber || '',
        fieldStrength: item.fieldStrength || '',
        installDate: item.installDate,
        softwareVersion: item.softwareVersion || '',
        serviceContractExpiry: item.serviceContractExpiry,
        status: item.status,
        notes: item.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData({ ...emptyForm, locationId: locationFilter || '' });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name as string]: value }));
  };

  const handleSave = async () => {
    const now = new Date();
    if (editingId) {
      await db.equipment.update(editingId, {
        ...formData,
        updatedAt: now,
      });
    } else {
      const newEquipment: Equipment = {
        id: uuidv4(),
        ...formData,
        createdAt: now,
        updatedAt: now,
      };
      await db.equipment.add(newEquipment);
    }
    handleClose();
  };

  const handleDelete = async (id: string) => {
    await db.equipment.delete(id);
    await db.events.where('equipmentId').equals(id).delete();
    setDeleteConfirm(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'warning';
      case 'decommissioned':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4">Equipment</Typography>
          {locationFilter && (
            <Chip
              label={`Filtered: ${getLocationName(locationFilter)}`}
              onDelete={() => navigate('/equipment')}
              size="small"
              sx={{ mt: 1 }}
            />
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          disabled={!locations || locations.length === 0}
        >
          Add Equipment
        </Button>
      </Box>

      {(!locations || locations.length === 0) && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">
            Add a location first before adding equipment.
          </Typography>
          <Button sx={{ mt: 2 }} onClick={() => navigate('/locations')}>
            Go to Locations
          </Button>
        </Box>
      )}

      <Grid container spacing={3}>
        {filteredEquipment.map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h6" gutterBottom>
                    {item.name}
                  </Typography>
                  <Chip
                    label={item.status}
                    size="small"
                    color={getStatusColor(item.status)}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {item.manufacturer} {item.model}
                </Typography>
                {item.fieldStrength && (
                  <Typography variant="body2" color="text.secondary">
                    Field Strength: {item.fieldStrength}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Location: {getLocationName(item.locationId)}
                </Typography>
                {item.serialNumber && (
                  <Typography variant="body2" color="text.secondary">
                    S/N: {item.serialNumber}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Chip
                    icon={<EventIcon />}
                    label={`${eventCounts?.[item.id] || 0} Events`}
                    size="small"
                    variant="outlined"
                    onClick={() => navigate(`/events?equipment=${item.id}`)}
                  />
                </Stack>
              </CardContent>
              <CardActions>
                <IconButton size="small" onClick={() => handleOpen(item)}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" onClick={() => setDeleteConfirm(item.id)}>
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredEquipment.length === 0 && locations && locations.length > 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">
            No equipment found. Add your first equipment to get started.
          </Typography>
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Location</InputLabel>
              <Select
                name="locationId"
                value={formData.locationId}
                label="Location"
                onChange={(e) => handleChange(e as React.ChangeEvent<HTMLInputElement>)}
              >
                {locations?.map((loc) => (
                  <MenuItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              name="name"
              label="Equipment Name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
              placeholder="e.g., MRI Scanner 1"
            />
            <TextField
              name="manufacturer"
              label="Manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              required
              fullWidth
              placeholder="e.g., Siemens, GE, Philips"
            />
            <TextField
              name="model"
              label="Model"
              value={formData.model}
              onChange={handleChange}
              required
              fullWidth
              placeholder="e.g., MAGNETOM Vida"
            />
            <FormControl fullWidth>
              <InputLabel>Field Strength</InputLabel>
              <Select
                name="fieldStrength"
                value={formData.fieldStrength}
                label="Field Strength"
                onChange={(e) => handleChange(e as React.ChangeEvent<HTMLInputElement>)}
              >
                {fieldStrengthOptions.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              name="serialNumber"
              label="Serial Number"
              value={formData.serialNumber}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              name="installDate"
              label="Installation Date"
              type="date"
              value={formData.installDate ? format(formData.installDate, 'yyyy-MM-dd') : ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  installDate: e.target.value ? new Date(e.target.value) : undefined,
                }))
              }
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              name="softwareVersion"
              label="Software Version"
              value={formData.softwareVersion}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              name="serviceContractExpiry"
              label="Service Contract Expiry"
              type="date"
              value={
                formData.serviceContractExpiry
                  ? format(formData.serviceContractExpiry, 'yyyy-MM-dd')
                  : ''
              }
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  serviceContractExpiry: e.target.value ? new Date(e.target.value) : undefined,
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
              name="notes"
              label="Notes"
              value={formData.notes}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.name || !formData.locationId || !formData.manufacturer || !formData.model}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Equipment?</DialogTitle>
        <DialogContent>
          <Typography>
            This will also delete all events associated with this equipment. This action cannot be
            undone.
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
