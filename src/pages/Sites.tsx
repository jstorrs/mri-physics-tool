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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Place as LocationIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../db';
import type { Site, SiteFormData } from '../types';

const emptyForm: SiteFormData = {
  organizationId: '',
  name: '',
  address: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  notes: '',
};

export default function Sites() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const organizationFilter = searchParams.get('organization');

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SiteFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const organizations = useLiveQuery(() => db.organizations.orderBy('name').toArray());

  const sites = useLiveQuery(() => {
    if (organizationFilter) {
      return db.sites.where('organizationId').equals(organizationFilter).sortBy('name');
    }
    return db.sites.orderBy('name').toArray();
  }, [organizationFilter]);

  const locationCounts = useLiveQuery(async () => {
    const locations = await db.locations.toArray();
    const counts: Record<string, number> = {};
    locations.forEach((l) => {
      if (l.siteId) {
        counts[l.siteId] = (counts[l.siteId] || 0) + 1;
      }
    });
    return counts;
  });

  const filterOrganization = organizations?.find((o) => o.id === organizationFilter);

  const handleOpen = (site?: Site) => {
    if (site) {
      setEditingId(site.id);
      setFormData({
        organizationId: site.organizationId,
        name: site.name,
        address: site.address || '',
        contactName: site.contactName || '',
        contactPhone: site.contactPhone || '',
        contactEmail: site.contactEmail || '',
        notes: site.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData({
        ...emptyForm,
        organizationId: organizationFilter || '',
      });
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
      await db.sites.update(editingId, {
        ...formData,
        updatedAt: now,
      });
    } else {
      const newSite: Site = {
        id: uuidv4(),
        ...formData,
        createdAt: now,
        updatedAt: now,
      };
      await db.sites.add(newSite);
    }
    handleClose();
  };

  const handleDelete = async (id: string) => {
    // Get all locations for this site
    const locations = await db.locations.where('siteId').equals(id).toArray();
    const locationIds = locations.map((l) => l.id);

    // Delete in reverse order of hierarchy
    await db.equipment.where('locationId').anyOf(locationIds).delete();
    await db.locations.where('siteId').equals(id).delete();
    await db.sites.delete(id);

    setDeleteConfirm(null);
  };

  const clearFilter = () => {
    setSearchParams({});
  };

  const getOrganizationName = (organizationId: string) => {
    return organizations?.find((o) => o.id === organizationId)?.name || 'Unknown';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">Sites</Typography>
          {filterOrganization && (
            <Chip
              label={filterOrganization.name}
              onDelete={clearFilter}
              deleteIcon={<CloseIcon />}
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          disabled={!organizations || organizations.length === 0}
        >
          Add Site
        </Button>
      </Box>

      {(!organizations || organizations.length === 0) && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">
            Please create an organization first before adding sites.
          </Typography>
          <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate('/organizations')}>
            Go to Organizations
          </Button>
        </Box>
      )}

      <Grid container spacing={3}>
        {sites?.map((site) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={site.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {site.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {getOrganizationName(site.organizationId)}
                </Typography>
                {site.address && (
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {site.address}
                  </Typography>
                )}
                {site.contactName && (
                  <Typography variant="body2">Contact: {site.contactName}</Typography>
                )}
                <Box sx={{ mt: 2 }}>
                  <Chip
                    icon={<LocationIcon />}
                    label={`${locationCounts?.[site.id] || 0} Locations`}
                    size="small"
                    onClick={() => navigate(`/locations?site=${site.id}`)}
                  />
                </Box>
              </CardContent>
              <CardActions>
                <IconButton size="small" onClick={() => handleOpen(site)}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" onClick={() => setDeleteConfirm(site.id)}>
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {organizations && organizations.length > 0 && sites?.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary">
            No sites yet. Add your first site to get started.
          </Typography>
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Site' : 'Add Site'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Organization</InputLabel>
              <Select
                name="organizationId"
                value={formData.organizationId}
                label="Organization"
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, organizationId: e.target.value }))
                }
              >
                {organizations?.map((org) => (
                  <MenuItem key={org.id} value={org.id}>
                    {org.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              name="name"
              label="Site Name"
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
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.name || !formData.organizationId}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Site?</DialogTitle>
        <DialogContent>
          <Typography>
            This will also delete all locations and equipment associated with this site.
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
