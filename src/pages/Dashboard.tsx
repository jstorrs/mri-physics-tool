import { useLiveQuery } from 'dexie-react-hooks';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Science as EquipmentIcon,
  Event as EventIcon,
  PhotoLibrary as GalleryIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { db } from '../db';

export default function Dashboard() {
  const locations = useLiveQuery(() => db.locations.count());
  const equipment = useLiveQuery(() => db.equipment.count());
  const events = useLiveQuery(() => db.events.count());
  const images = useLiveQuery(() => db.images.count());

  const recentEvents = useLiveQuery(() =>
    db.events.orderBy('createdAt').reverse().limit(5).toArray()
  );

  const upcomingEvents = useLiveQuery(() =>
    db.events
      .where('status')
      .equals('scheduled')
      .toArray()
      .then((events) =>
        events
          .filter((e) => e.scheduledDate && e.scheduledDate >= new Date())
          .sort((a, b) => (a.scheduledDate?.getTime() || 0) - (b.scheduledDate?.getTime() || 0))
          .slice(0, 5)
      )
  );

  const stats = [
    { label: 'Locations', value: locations ?? 0, icon: <LocationIcon fontSize="large" />, color: '#1976d2' },
    { label: 'Equipment', value: equipment ?? 0, icon: <EquipmentIcon fontSize="large" />, color: '#2e7d32' },
    { label: 'Events', value: events ?? 0, icon: <EventIcon fontSize="large" />, color: '#ed6c02' },
    { label: 'Images', value: images ?? 0, icon: <GalleryIcon fontSize="large" />, color: '#9c27b0' },
  ];

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

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat) => (
          <Grid size={{ xs: 6, sm: 3 }} key={stat.label}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ color: stat.color, mb: 1 }}>{stat.icon}</Box>
                <Typography variant="h4" component="div">
                  {stat.value}
                </Typography>
                <Typography color="text.secondary">{stat.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              {recentEvents && recentEvents.length > 0 ? (
                <List dense>
                  {recentEvents.map((event) => (
                    <ListItem key={event.id}>
                      <ListItemText
                        primary={event.title}
                        secondary={format(event.createdAt, 'MMM d, yyyy')}
                      />
                      <Chip
                        label={event.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(event.status)}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">No recent activity</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Events
              </Typography>
              {upcomingEvents && upcomingEvents.length > 0 ? (
                <List dense>
                  {upcomingEvents.map((event) => (
                    <ListItem key={event.id}>
                      <ListItemText
                        primary={event.title}
                        secondary={
                          event.scheduledDate
                            ? format(event.scheduledDate, 'MMM d, yyyy')
                            : 'No date'
                        }
                      />
                      <Chip label={event.type.replace('_', ' ')} size="small" variant="outlined" />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">No upcoming events</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
