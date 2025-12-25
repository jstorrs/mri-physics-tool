import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/icons-material';
import { db } from '../db';
import type { Organization, Site, Location as LocationType } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationType | null>(null);

  const organizations = useLiveQuery(() => db.organizations.orderBy('name').toArray());

  const sites = useLiveQuery(
    () => selectedOrg
      ? db.sites.where('organizationId').equals(selectedOrg.id).sortBy('name')
      : Promise.resolve([] as Site[]),
    [selectedOrg]
  );

  const locations = useLiveQuery(
    () => selectedSite
      ? db.locations.where('siteId').equals(selectedSite.id).sortBy('name')
      : Promise.resolve([] as LocationType[]),
    [selectedSite]
  );

  const equipmentCount = useLiveQuery(
    () => selectedLocation
      ? db.equipment.where('locationId').equals(selectedLocation.id).count()
      : Promise.resolve(0),
    [selectedLocation]
  );

  const handleOrgClick = (org: Organization) => {
    setSelectedOrg(org);
    setSelectedSite(null);
    setSelectedLocation(null);
  };

  const handleSiteClick = (site: Site) => {
    setSelectedSite(site);
    setSelectedLocation(null);
  };

  const handleLocationClick = (location: LocationType) => {
    setSelectedLocation(location);
  };

  const handleBreadcrumbClick = (level: 'root' | 'org' | 'site') => {
    if (level === 'root') {
      setSelectedOrg(null);
      setSelectedSite(null);
      setSelectedLocation(null);
    } else if (level === 'org') {
      setSelectedSite(null);
      setSelectedLocation(null);
    } else if (level === 'site') {
      setSelectedLocation(null);
    }
  };

  // Render breadcrumbs
  const renderBreadcrumbs = () => (
    <Breadcrumbs sx={{ mb: 2 }}>
      <Link
        component="button"
        variant="body1"
        onClick={() => handleBreadcrumbClick('root')}
        underline="hover"
        color={selectedOrg ? 'inherit' : 'text.primary'}
        sx={{ cursor: 'pointer' }}
      >
        Organizations
      </Link>
      {selectedOrg && (
        <Link
          component="button"
          variant="body1"
          onClick={() => handleBreadcrumbClick('org')}
          underline="hover"
          color={selectedSite ? 'inherit' : 'text.primary'}
          sx={{ cursor: 'pointer' }}
        >
          {selectedOrg.name}
        </Link>
      )}
      {selectedSite && (
        <Link
          component="button"
          variant="body1"
          onClick={() => handleBreadcrumbClick('site')}
          underline="hover"
          color={selectedLocation ? 'inherit' : 'text.primary'}
          sx={{ cursor: 'pointer' }}
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Select Organization</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => navigate('/organizations')}
          size="small"
        >
          Manage
        </Button>
      </Box>
      {organizations && organizations.length > 0 ? (
        <List>
          {organizations.map((org) => (
            <ListItem key={org.id} disablePadding>
              <ListItemButton onClick={() => handleOrgClick(org)}>
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
        </List>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <OrganizationIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>No organizations yet</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Start by creating your first organization
            </Typography>
            <Button variant="contained" onClick={() => navigate('/organizations')}>
              Add Organization
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  // Render site list
  const renderSites = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Select Site</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => navigate(`/sites?organization=${selectedOrg?.id}`)}
          size="small"
        >
          Manage
        </Button>
      </Box>
      {sites && sites.length > 0 ? (
        <List>
          {sites.map((site) => (
            <ListItem key={site.id} disablePadding>
              <ListItemButton onClick={() => handleSiteClick(site)}>
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
        </List>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <SiteIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>No sites yet</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Add sites to {selectedOrg?.name}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate(`/sites?organization=${selectedOrg?.id}`)}
            >
              Add Site
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  // Render location list
  const renderLocations = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Select Location</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => navigate(`/locations?site=${selectedSite?.id}`)}
          size="small"
        >
          Manage
        </Button>
      </Box>
      {locations && locations.length > 0 ? (
        <List>
          {locations.map((location) => (
            <ListItem key={location.id} disablePadding>
              <ListItemButton onClick={() => handleLocationClick(location)}>
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
        </List>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <LocationIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>No locations yet</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Add scanner locations to {selectedSite?.name}
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate(`/locations?site=${selectedSite?.id}`)}
            >
              Add Location
            </Button>
          </CardContent>
        </Card>
      )}
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

      {!selectedOrg && renderOrganizations()}
      {selectedOrg && !selectedSite && renderSites()}
      {selectedSite && !selectedLocation && renderLocations()}
      {selectedLocation && renderQuickActions()}
    </Box>
  );
}
