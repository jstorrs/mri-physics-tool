import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
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
  Grid,
  IconButton,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Science as EquipmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import type { Location, LocationFormData } from '../types';

const emptyForm: LocationFormData = {
  name: '',
  address: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  notes: '',
};

export default function Locations() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<LocationFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const locations = useLiveQuery(() => db.locations.orderBy('name').toArray());

  const equipmentCounts = useLiveQuery(async () => {
    const equipment = await db.equipment.toArray();
    const counts: Record<string, number> = {};
    equipment.forEach((e) => {
      counts[e.locationId] = (counts[e.locationId] || 0) + 1;
    });
    return counts;
  });

  const handleOpen = (location?: Location) => {
    if (location) {
      setEditingId(location.id);
      setFormData({
        name: location.name,
        address: location.address || '',
        contactName: location.contactName || '',
        contactPhone: location.contactPhone || '',
        contactEmail: location.contactEmail || '',
        notes: location.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData(emptyForm);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    const now = new Date();
    if (editingId) {
      await db.locations.update(editingId, {
        ...formData,
        updatedAt: now,
      });
    } else {
      const newLocation: Location = {
        id: uuidv4(),
        ...formData,
        createdAt: now,
        updatedAt: now,
      };
      await db.locations.add(newLocation);
    }
    handleClose();
  };

  const handleDelete = async (id: string) => {
    await db.locations.delete(id);
    // Also delete associated equipment
    await db.equipment.where('locationId').equals(id).delete();
    setDeleteConfirm(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Locations</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Location
        </Button>
      </Box>

      <Grid container spacing={3}>
        {locations?.map((location) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={location.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {location.name}
                </Typography>
                {location.address && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {location.address}
                  </Typography>
                )}
                {location.contactName && (
                  <Typography variant="body2">Contact: {location.contactName}</Typography>
                )}
                <Box sx={{ mt: 2 }}>
                  <Chip
                    icon={<EquipmentIcon />}
                    label={`${equipmentCounts?.[location.id] || 0} Equipment`}
                    size="small"
                    onClick={() => navigate(`/equipment?location=${location.id}`)}
                  />
                </Box>
              </CardContent>
              <CardActions>
                <IconButton size="small" onClick={() => handleOpen(location)}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" onClick={() => setDeleteConfirm(location.id)}>
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {locations?.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">No locations yet. Add your first location to get started.</Typography>
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Location' : 'Add Location'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              name="name"
              label="Location Name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              name="address"
              label="Address"
              value={formData.address}
              onChange={handleChange}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              name="contactName"
              label="Contact Name"
              value={formData.contactName}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              name="contactPhone"
              label="Contact Phone"
              value={formData.contactPhone}
              onChange={handleChange}
              fullWidth
            />
            <TextField
              name="contactEmail"
              label="Contact Email"
              value={formData.contactEmail}
              onChange={handleChange}
              fullWidth
              type="email"
            />
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
          <Button onClick={handleSave} variant="contained" disabled={!formData.name}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Location?</DialogTitle>
        <DialogContent>
          <Typography>
            This will also delete all equipment associated with this location. This action cannot be undone.
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
