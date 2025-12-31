import { useState, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Breadcrumbs,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Divider,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  CorporateFare as OrganizationIcon,
  Business as SiteIcon,
  LocationOn as LocationIcon,
  Science as EquipmentIcon,
  Event as EventIcon,
  PhotoCamera as CameraIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { db } from '../db';
import type {
  Organization,
  OrganizationFormData,
  Site,
  SiteFormData,
  Location as LocationType,
  LocationFormData,
} from '../types';

// Empty form templates
const emptyOrgForm: OrganizationFormData = {
  name: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  notes: '',
};

const emptySiteForm: SiteFormData = {
  organizationId: '',
  name: '',
  address: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  notes: '',
};

const emptyLocationForm: LocationFormData = {
  siteId: '',
  name: '',
  address: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  notes: '',
};

// Long-press duration in milliseconds
const LONG_PRESS_DURATION = 500;

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Read IDs from URL
  const orgId = searchParams.get('org');
  const siteId = searchParams.get('site');
  const locationId = searchParams.get('location');

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    type: 'org' | 'site' | 'location';
    item: Organization | Site | LocationType;
  } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Dialog state
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'org' | 'site' | 'location';
    id: string;
    name: string;
  } | null>(null);

  // Form state
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [orgForm, setOrgForm] = useState<OrganizationFormData>(emptyOrgForm);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [siteForm, setSiteForm] = useState<SiteFormData>(emptySiteForm);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState<LocationFormData>(emptyLocationForm);

  // Data queries
  const organizations = useLiveQuery(() => db.organizations.orderBy('name').toArray());

  const selectedOrg = useLiveQuery(
    () => orgId ? db.organizations.get(orgId) : Promise.resolve(undefined),
    [orgId]
  );

  const selectedSite = useLiveQuery(
    () => siteId ? db.sites.get(siteId) : Promise.resolve(undefined),
    [siteId]
  );

  const selectedLocation = useLiveQuery(
    () => locationId ? db.locations.get(locationId) : Promise.resolve(undefined),
    [locationId]
  );

  const sites = useLiveQuery(
    () => orgId
      ? db.sites.where('organizationId').equals(orgId).sortBy('name')
      : Promise.resolve([] as Site[]),
    [orgId]
  );

  const locations = useLiveQuery(
    () => siteId
      ? db.locations.where('siteId').equals(siteId).sortBy('name')
      : Promise.resolve([] as LocationType[]),
    [siteId]
  );

  const equipmentCount = useLiveQuery(
    () => locationId
      ? db.equipment.where('locationId').equals(locationId).count()
      : Promise.resolve(0),
    [locationId]
  );

  // URL helpers
  const getOrgUrl = (org: Organization) => `/?org=${org.id}`;
  const getSiteUrl = (site: Site) => `/?org=${orgId}&site=${site.id}`;
  const getLocationUrl = (location: LocationType) => `/?org=${orgId}&site=${siteId}&location=${location.id}`;

  const getBreadcrumbUrl = (level: 'root' | 'org' | 'site') => {
    if (level === 'root') return '/';
    if (level === 'org') return `/?org=${orgId}`;
    return `/?org=${orgId}&site=${siteId}`;
  };

  // Long-press handlers
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleContextMenu = (
    e: React.MouseEvent,
    type: 'org' | 'site' | 'location',
    item: Organization | Site | LocationType
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
      type,
      item,
    });
  };

  const handleTouchStart = (
    e: React.TouchEvent,
    type: 'org' | 'site' | 'location',
    item: Organization | Site | LocationType
  ) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    longPressTimer.current = setTimeout(() => {
      setContextMenu({
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        type,
        item,
      });
    }, LONG_PRESS_DURATION);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartPos.current) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPos.current.x);
      const dy = Math.abs(touch.clientY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        clearLongPressTimer();
      }
    }
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();
    touchStartPos.current = null;
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  // Organization handlers
  const handleOpenOrgDialog = (org?: Organization) => {
    if (org) {
      setEditingOrgId(org.id);
      setOrgForm({
        name: org.name,
        contactName: org.contactName || '',
        contactPhone: org.contactPhone || '',
        contactEmail: org.contactEmail || '',
        notes: org.notes || '',
      });
    } else {
      setEditingOrgId(null);
      setOrgForm(emptyOrgForm);
    }
    setOrgDialogOpen(true);
    handleContextMenuClose();
  };

  const handleCloseOrgDialog = () => {
    setOrgDialogOpen(false);
    setEditingOrgId(null);
    setOrgForm(emptyOrgForm);
  };

  const handleSaveOrg = async () => {
    const now = new Date();
    if (editingOrgId) {
      await db.organizations.update(editingOrgId, { ...orgForm, updatedAt: now });
    } else {
      await db.organizations.add({
        id: uuidv4(),
        ...orgForm,
        createdAt: now,
        updatedAt: now,
      });
    }
    handleCloseOrgDialog();
  };

  // Site handlers
  const handleOpenSiteDialog = (site?: Site) => {
    if (site) {
      setEditingSiteId(site.id);
      setSiteForm({
        organizationId: site.organizationId,
        name: site.name,
        address: site.address || '',
        contactName: site.contactName || '',
        contactPhone: site.contactPhone || '',
        contactEmail: site.contactEmail || '',
        notes: site.notes || '',
      });
    } else {
      setEditingSiteId(null);
      setSiteForm({ ...emptySiteForm, organizationId: orgId || '' });
    }
    setSiteDialogOpen(true);
    handleContextMenuClose();
  };

  const handleCloseSiteDialog = () => {
    setSiteDialogOpen(false);
    setEditingSiteId(null);
    setSiteForm(emptySiteForm);
  };

  const handleSaveSite = async () => {
    const now = new Date();
    if (editingSiteId) {
      await db.sites.update(editingSiteId, { ...siteForm, updatedAt: now });
    } else {
      await db.sites.add({
        id: uuidv4(),
        ...siteForm,
        createdAt: now,
        updatedAt: now,
      });
    }
    handleCloseSiteDialog();
  };

  // Location handlers
  const handleOpenLocationDialog = (location?: LocationType) => {
    if (location) {
      setEditingLocationId(location.id);
      setLocationForm({
        siteId: location.siteId || '',
        name: location.name,
        address: location.address || '',
        contactName: location.contactName || '',
        contactPhone: location.contactPhone || '',
        contactEmail: location.contactEmail || '',
        notes: location.notes || '',
      });
    } else {
      setEditingLocationId(null);
      setLocationForm({ ...emptyLocationForm, siteId: siteId || '' });
    }
    setLocationDialogOpen(true);
    handleContextMenuClose();
  };

  const handleCloseLocationDialog = () => {
    setLocationDialogOpen(false);
    setEditingLocationId(null);
    setLocationForm(emptyLocationForm);
  };

  const handleSaveLocation = async () => {
    const now = new Date();
    if (editingLocationId) {
      await db.locations.update(editingLocationId, { ...locationForm, updatedAt: now });
    } else {
      await db.locations.add({
        id: uuidv4(),
        ...locationForm,
        createdAt: now,
        updatedAt: now,
      });
    }
    handleCloseLocationDialog();
  };

  // Delete handlers
  const handleDeleteClick = (type: 'org' | 'site' | 'location', id: string, name: string) => {
    setDeleteConfirm({ type, id, name });
    handleContextMenuClose();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    const { type, id } = deleteConfirm;

    if (type === 'org') {
      const orgSites = await db.sites.where('organizationId').equals(id).toArray();
      const siteIds = orgSites.map((s) => s.id);
      const orgLocations = await db.locations.where('siteId').anyOf(siteIds).toArray();
      const locationIds = orgLocations.map((l) => l.id);
      await db.equipment.where('locationId').anyOf(locationIds).delete();
      await db.locations.where('siteId').anyOf(siteIds).delete();
      await db.sites.where('organizationId').equals(id).delete();
      await db.organizations.delete(id);
    } else if (type === 'site') {
      const siteLocations = await db.locations.where('siteId').equals(id).toArray();
      const locationIds = siteLocations.map((l) => l.id);
      await db.equipment.where('locationId').anyOf(locationIds).delete();
      await db.locations.where('siteId').equals(id).delete();
      await db.sites.delete(id);
    } else if (type === 'location') {
      await db.equipment.where('locationId').equals(id).delete();
      await db.locations.delete(id);
    }

    setDeleteConfirm(null);

    // Navigate back if we deleted the currently selected item
    if (type === 'org' && id === orgId) {
      navigate('/');
    } else if (type === 'site' && id === siteId) {
      navigate(`/?org=${orgId}`);
    } else if (type === 'location' && id === locationId) {
      navigate(`/?org=${orgId}&site=${siteId}`);
    }
  };

  // Render breadcrumbs
  const renderBreadcrumbs = () => (
    <Breadcrumbs sx={{ mb: 2 }}>
      <Link
        component={RouterLink}
        to={getBreadcrumbUrl('root')}
        variant="body1"
        underline="hover"
        color={selectedOrg ? 'inherit' : 'text.primary'}
      >
        Organizations
      </Link>
      {selectedOrg && (
        <Link
          component={RouterLink}
          to={getBreadcrumbUrl('org')}
          variant="body1"
          underline="hover"
          color={selectedSite ? 'inherit' : 'text.primary'}
        >
          {selectedOrg.name}
        </Link>
      )}
      {selectedSite && (
        <Link
          component={RouterLink}
          to={getBreadcrumbUrl('site')}
          variant="body1"
          underline="hover"
          color={selectedLocation ? 'inherit' : 'text.primary'}
        >
          {selectedSite.name}
        </Link>
      )}
      {selectedLocation && (
        <Typography color="text.primary">{selectedLocation.name}</Typography>
      )}
    </Breadcrumbs>
  );

  // Render organization list
  const renderOrganizations = () => (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Select Organization</Typography>
      <List>
        {organizations?.map((org) => (
          <ListItem key={org.id} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={getOrgUrl(org)}
              onContextMenu={(e) => handleContextMenu(e, 'org', org)}
              onTouchStart={(e) => handleTouchStart(e, 'org', org)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <ListItemIcon>
                <OrganizationIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={org.name}
                secondary={org.contactName}
              />
              <ChevronRightIcon color="action" />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleOpenOrgDialog()}>
            <ListItemIcon>
              <AddIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Add new organization..." />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  // Render site list
  const renderSites = () => (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Select Site</Typography>
      <List>
        {sites?.map((site) => (
          <ListItem key={site.id} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={getSiteUrl(site)}
              onContextMenu={(e) => handleContextMenu(e, 'site', site)}
              onTouchStart={(e) => handleTouchStart(e, 'site', site)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <ListItemIcon>
                <SiteIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={site.name}
                secondary={site.address}
              />
              <ChevronRightIcon color="action" />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleOpenSiteDialog()}>
            <ListItemIcon>
              <AddIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Add new site..." />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  // Render location list
  const renderLocations = () => (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Select Location</Typography>
      <List>
        {locations?.map((location) => (
          <ListItem key={location.id} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={getLocationUrl(location)}
              onContextMenu={(e) => handleContextMenu(e, 'location', location)}
              onTouchStart={(e) => handleTouchStart(e, 'location', location)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <ListItemIcon>
                <LocationIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={location.name}
                secondary={location.address}
              />
              <ChevronRightIcon color="action" />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleOpenLocationDialog()}>
            <ListItemIcon>
              <AddIcon color="primary" />
            </ListItemIcon>
            <ListItemText primary="Add new location..." />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  // Render quick actions for selected location
  const renderQuickActions = () => (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>{selectedLocation?.name}</Typography>
        {selectedLocation?.address && (
          <Typography color="text.secondary">{selectedLocation.address}</Typography>
        )}
        <Chip
          icon={<EquipmentIcon />}
          label={`${equipmentCount ?? 0} Equipment`}
          size="small"
          sx={{ mt: 1 }}
        />
      </Box>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="h6" gutterBottom>Quick Actions</Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Card>
          <CardActionArea onClick={() => navigate(`/equipment?location=${selectedLocation?.id}`)}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <EquipmentIcon color="success" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6">View Equipment</Typography>
                <Typography variant="body2" color="text.secondary">
                  See all equipment at this location
                </Typography>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>

        <Card>
          <CardActionArea onClick={() => navigate(`/events?location=${selectedLocation?.id}`)}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <EventIcon color="warning" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6">View Events</Typography>
                <Typography variant="body2" color="text.secondary">
                  See service events for this location
                </Typography>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>

        <Card>
          <CardActionArea onClick={() => navigate(`/events?location=${selectedLocation?.id}&action=new`)}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AddIcon color="primary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6">New Event</Typography>
                <Typography variant="body2" color="text.secondary">
                  Create a new service event
                </Typography>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>

        <Card>
          <CardActionArea onClick={() => navigate(`/gallery?location=${selectedLocation?.id}`)}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CameraIcon color="secondary" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h6">Take Photo</Typography>
                <Typography variant="body2" color="text.secondary">
                  Capture images for this location
                </Typography>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    </Box>
  );

  return (
    <Box>
      {renderBreadcrumbs()}

      {!orgId && renderOrganizations()}
      {orgId && !siteId && renderSites()}
      {siteId && !locationId && renderLocations()}
      {locationId && renderQuickActions()}

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem
          onClick={() => {
            if (contextMenu?.type === 'org') {
              handleOpenOrgDialog(contextMenu.item as Organization);
            } else if (contextMenu?.type === 'site') {
              handleOpenSiteDialog(contextMenu.item as Site);
            } else if (contextMenu?.type === 'location') {
              handleOpenLocationDialog(contextMenu.item as LocationType);
            }
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (contextMenu) {
              handleDeleteClick(contextMenu.type, contextMenu.item.id, contextMenu.item.name);
            }
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>

      {/* Organization Dialog */}
      <Dialog open={orgDialogOpen} onClose={handleCloseOrgDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingOrgId ? 'Edit Organization' : 'Add Organization'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              name="name"
              label="Organization Name"
              value={orgForm.name}
              onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              name="contactName"
              label="Contact Name"
              value={orgForm.contactName}
              onChange={(e) => setOrgForm({ ...orgForm, contactName: e.target.value })}
              fullWidth
            />
            <TextField
              name="contactPhone"
              label="Contact Phone"
              value={orgForm.contactPhone}
              onChange={(e) => setOrgForm({ ...orgForm, contactPhone: e.target.value })}
              fullWidth
            />
            <TextField
              name="contactEmail"
              label="Contact Email"
              value={orgForm.contactEmail}
              onChange={(e) => setOrgForm({ ...orgForm, contactEmail: e.target.value })}
              fullWidth
              type="email"
            />
            <TextField
              name="notes"
              label="Notes"
              value={orgForm.notes}
              onChange={(e) => setOrgForm({ ...orgForm, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOrgDialog}>Cancel</Button>
          <Button onClick={handleSaveOrg} variant="contained" disabled={!orgForm.name}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Site Dialog */}
      <Dialog open={siteDialogOpen} onClose={handleCloseSiteDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSiteId ? 'Edit Site' : 'Add Site'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              name="name"
              label="Site Name"
              value={siteForm.name}
              onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              name="address"
              label="Address"
              value={siteForm.address}
              onChange={(e) => setSiteForm({ ...siteForm, address: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              name="contactName"
              label="Contact Name"
              value={siteForm.contactName}
              onChange={(e) => setSiteForm({ ...siteForm, contactName: e.target.value })}
              fullWidth
            />
            <TextField
              name="contactPhone"
              label="Contact Phone"
              value={siteForm.contactPhone}
              onChange={(e) => setSiteForm({ ...siteForm, contactPhone: e.target.value })}
              fullWidth
            />
            <TextField
              name="contactEmail"
              label="Contact Email"
              value={siteForm.contactEmail}
              onChange={(e) => setSiteForm({ ...siteForm, contactEmail: e.target.value })}
              fullWidth
              type="email"
            />
            <TextField
              name="notes"
              label="Notes"
              value={siteForm.notes}
              onChange={(e) => setSiteForm({ ...siteForm, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSiteDialog}>Cancel</Button>
          <Button onClick={handleSaveSite} variant="contained" disabled={!siteForm.name}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={locationDialogOpen} onClose={handleCloseLocationDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingLocationId ? 'Edit Location' : 'Add Location'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              name="name"
              label="Location Name"
              value={locationForm.name}
              onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              name="address"
              label="Address"
              value={locationForm.address}
              onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              name="contactName"
              label="Contact Name"
              value={locationForm.contactName}
              onChange={(e) => setLocationForm({ ...locationForm, contactName: e.target.value })}
              fullWidth
            />
            <TextField
              name="contactPhone"
              label="Contact Phone"
              value={locationForm.contactPhone}
              onChange={(e) => setLocationForm({ ...locationForm, contactPhone: e.target.value })}
              fullWidth
            />
            <TextField
              name="contactEmail"
              label="Contact Email"
              value={locationForm.contactEmail}
              onChange={(e) => setLocationForm({ ...locationForm, contactEmail: e.target.value })}
              fullWidth
              type="email"
            />
            <TextField
              name="notes"
              label="Notes"
              value={locationForm.notes}
              onChange={(e) => setLocationForm({ ...locationForm, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLocationDialog}>Cancel</Button>
          <Button onClick={handleSaveLocation} variant="contained" disabled={!locationForm.name}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete {deleteConfirm?.type === 'org' ? 'Organization' : deleteConfirm?.type === 'site' ? 'Site' : 'Location'}?</DialogTitle>
        <DialogContent>
          <Typography>
            {deleteConfirm?.type === 'org' &&
              'This will delete all sites, locations, and equipment in this organization.'}
            {deleteConfirm?.type === 'site' &&
              'This will delete all locations and equipment at this site.'}
            {deleteConfirm?.type === 'location' &&
              'This will delete all equipment at this location.'}
            {' '}This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button onClick={handleDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
