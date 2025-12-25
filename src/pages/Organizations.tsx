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
  Business as SiteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import type { Organization, OrganizationFormData } from '../types';

const emptyForm: OrganizationFormData = {
  name: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  notes: '',
};

export default function Organizations() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<OrganizationFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const organizations = useLiveQuery(() => db.organizations.orderBy('name').toArray());

  const siteCounts = useLiveQuery(async () => {
    const sites = await db.sites.toArray();
    const counts: Record<string, number> = {};
    sites.forEach((s) => {
      counts[s.organizationId] = (counts[s.organizationId] || 0) + 1;
    });
    return counts;
  });

  const handleOpen = (organization?: Organization) => {
    if (organization) {
      setEditingId(organization.id);
      setFormData({
        name: organization.name,
        contactName: organization.contactName || '',
        contactPhone: organization.contactPhone || '',
        contactEmail: organization.contactEmail || '',
        notes: organization.notes || '',
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
      await db.organizations.update(editingId, {
        ...formData,
        updatedAt: now,
      });
    } else {
      const newOrganization: Organization = {
        id: uuidv4(),
        ...formData,
        createdAt: now,
        updatedAt: now,
      };
      await db.organizations.add(newOrganization);
    }
    handleClose();
  };

  const handleDelete = async (id: string) => {
    // Get all sites for this organization
    const sites = await db.sites.where('organizationId').equals(id).toArray();
    const siteIds = sites.map((s) => s.id);

    // Get all locations for these sites
    const locations = await db.locations.where('siteId').anyOf(siteIds).toArray();
    const locationIds = locations.map((l) => l.id);

    // Delete in reverse order of hierarchy
    await db.equipment.where('locationId').anyOf(locationIds).delete();
    await db.locations.where('siteId').anyOf(siteIds).delete();
    await db.sites.where('organizationId').equals(id).delete();
    await db.organizations.delete(id);

    setDeleteConfirm(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Organizations</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          Add Organization
        </Button>
      </Box>

      <Grid container spacing={3}>
        {organizations?.map((organization) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={organization.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {organization.name}
                </Typography>
                {organization.contactName && (
                  <Typography variant="body2">Contact: {organization.contactName}</Typography>
                )}
                {organization.contactEmail && (
                  <Typography variant="body2" color="text.secondary">
                    {organization.contactEmail}
                  </Typography>
                )}
                <Box sx={{ mt: 2 }}>
                  <Chip
                    icon={<SiteIcon />}
                    label={`${siteCounts?.[organization.id] || 0} Sites`}
                    size="small"
                    onClick={() => navigate(`/sites?organization=${organization.id}`)}
                  />
                </Box>
              </CardContent>
              <CardActions>
                <IconButton size="small" onClick={() => handleOpen(organization)}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" onClick={() => setDeleteConfirm(organization.id)}>
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {organizations?.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">
            No organizations yet. Add your first organization to get started.
          </Typography>
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Organization' : 'Add Organization'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              name="name"
              label="Organization Name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
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
        <DialogTitle>Delete Organization?</DialogTitle>
        <DialogContent>
          <Typography>
            This will also delete all sites, locations, and equipment associated with this organization.
            This action cannot be undone.
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
