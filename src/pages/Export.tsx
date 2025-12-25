import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import {
  FileDownload as DownloadIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { db } from '../db';

type ExportFormat = 'json' | 'csv';
type ExportScope = 'all' | 'organizations' | 'sites' | 'locations' | 'equipment' | 'events' | 'images';

export default function Export() {
  const [format_, setFormat] = useState<ExportFormat>('json');
  const [scope, setScope] = useState<ExportScope>('all');
  const [includeImages, setIncludeImages] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const organizations = useLiveQuery(() => db.organizations.count());
  const sites = useLiveQuery(() => db.sites.count());
  const locations = useLiveQuery(() => db.locations.count());
  const equipment = useLiveQuery(() => db.equipment.count());
  const events = useLiveQuery(() => db.events.count());
  const images = useLiveQuery(() => db.images.count());

  const exportToJSON = async () => {
    const data: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const dateFilter = (date: Date) => {
      if (dateFrom && date < new Date(dateFrom)) return false;
      if (dateTo && date > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    };

    if (scope === 'all' || scope === 'organizations') {
      data.organizations = await db.organizations.toArray();
    }

    if (scope === 'all' || scope === 'sites') {
      data.sites = await db.sites.toArray();
    }

    if (scope === 'all' || scope === 'locations') {
      data.locations = await db.locations.toArray();
    }

    if (scope === 'all' || scope === 'equipment') {
      data.equipment = await db.equipment.toArray();
    }

    if (scope === 'all' || scope === 'events') {
      let evts = await db.events.toArray();
      if (dateFrom || dateTo) {
        evts = evts.filter((e) => dateFilter(e.createdAt));
      }
      data.events = evts;
    }

    if ((scope === 'all' || scope === 'images') && includeImages) {
      let imgs = await db.images.toArray();
      if (dateFrom || dateTo) {
        imgs = imgs.filter((i) => dateFilter(i.capturedAt));
      }
      // Convert blobs to base64
      data.images = await Promise.all(
        imgs.map(async (img) => {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(img.blob);
          });
          return {
            ...img,
            blob: base64,
            thumbnailBlob: undefined, // Skip thumbnails to reduce size
          };
        })
      );
    }

    return data;
  };

  const exportToCSV = async () => {
    const csvFiles: Record<string, string> = {};

    const dateFilter = (date: Date) => {
      if (dateFrom && date < new Date(dateFrom)) return false;
      if (dateTo && date > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    };

    const toCSV = (data: Record<string, unknown>[]) => {
      if (data.length === 0) return '';
      const headers = Object.keys(data[0]).filter(
        (k) => !['blob', 'thumbnailBlob', 'customFields'].includes(k)
      );
      const rows = data.map((row) =>
        headers
          .map((h) => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            if (val instanceof Date) return val.toISOString();
            if (typeof val === 'object') return JSON.stringify(val);
            return String(val).includes(',') ? `"${val}"` : String(val);
          })
          .join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    };

    if (scope === 'all' || scope === 'organizations') {
      const orgs = await db.organizations.toArray();
      csvFiles['organizations.csv'] = toCSV(orgs as unknown as Record<string, unknown>[]);
    }

    if (scope === 'all' || scope === 'sites') {
      const siteList = await db.sites.toArray();
      csvFiles['sites.csv'] = toCSV(siteList as unknown as Record<string, unknown>[]);
    }

    if (scope === 'all' || scope === 'locations') {
      const locs = await db.locations.toArray();
      csvFiles['locations.csv'] = toCSV(locs as unknown as Record<string, unknown>[]);
    }

    if (scope === 'all' || scope === 'equipment') {
      const eqs = await db.equipment.toArray();
      csvFiles['equipment.csv'] = toCSV(eqs as unknown as Record<string, unknown>[]);
    }

    if (scope === 'all' || scope === 'events') {
      let evts = await db.events.toArray();
      if (dateFrom || dateTo) {
        evts = evts.filter((e) => dateFilter(e.createdAt));
      }
      csvFiles['events.csv'] = toCSV(evts as unknown as Record<string, unknown>[]);
    }

    if ((scope === 'all' || scope === 'images') && includeImages) {
      let imgs = await db.images.toArray();
      if (dateFrom || dateTo) {
        imgs = imgs.filter((i) => dateFilter(i.capturedAt));
      }
      // For CSV, just export metadata without blob
      csvFiles['images.csv'] = toCSV(
        imgs.map((i) => ({
          id: i.id,
          eventId: i.eventId,
          equipmentId: i.equipmentId,
          locationId: i.locationId,
          filename: i.filename,
          mimeType: i.mimeType,
          caption: i.caption,
          tags: i.tags?.join(';'),
          capturedAt: i.capturedAt,
          createdAt: i.createdAt,
        })) as unknown as Record<string, unknown>[]
      );
    }

    return csvFiles;
  };

  const downloadFile = (content: string | Blob, filename: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);

    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');

      if (format_ === 'json') {
        const data = await exportToJSON();
        const content = JSON.stringify(data, null, 2);
        downloadFile(content, `mri-physics-export_${timestamp}.json`);
      } else {
        const csvFiles = await exportToCSV();
        // If multiple files, download each
        for (const [filename, content] of Object.entries(csvFiles)) {
          if (content) {
            downloadFile(content, `mri-physics_${timestamp}_${filename}`);
          }
        }
      }

      setMessage({ type: 'success', text: 'Export completed successfully!' });
    } catch (err) {
      console.error('Export failed:', err);
      setMessage({ type: 'error', text: 'Export failed. Please try again.' });
    } finally {
      setExporting(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to delete ALL data? This cannot be undone!')) {
      return;
    }
    if (!confirm('This will permanently delete all organizations, sites, locations, equipment, events, and images. Continue?')) {
      return;
    }

    await db.organizations.clear();
    await db.sites.clear();
    await db.locations.clear();
    await db.equipment.clear();
    await db.events.clear();
    await db.images.clear();
    await db.timelines.clear();

    setMessage({ type: 'success', text: 'All data has been cleared.' });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Export Data
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Export Options
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Format
                  </Typography>
                  <RadioGroup
                    row
                    value={format_}
                    onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  >
                    <FormControlLabel value="json" control={<Radio />} label="JSON" />
                    <FormControlLabel value="csv" control={<Radio />} label="CSV" />
                  </RadioGroup>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Data Scope
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel>Select data to export</InputLabel>
                    <Select
                      value={scope}
                      label="Select data to export"
                      onChange={(e) => setScope(e.target.value as ExportScope)}
                    >
                      <MenuItem value="all">All Data</MenuItem>
                      <MenuItem value="organizations">Organizations Only</MenuItem>
                      <MenuItem value="sites">Sites Only</MenuItem>
                      <MenuItem value="locations">Locations Only</MenuItem>
                      <MenuItem value="equipment">Equipment Only</MenuItem>
                      <MenuItem value="events">Events Only</MenuItem>
                      <MenuItem value="images">Images Only</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Date Range (optional)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="From"
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                      label="To"
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Box>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={includeImages}
                      onChange={(e) => setIncludeImages(e.target.checked)}
                    />
                  }
                  label="Include images (may result in large file)"
                />

                {message && (
                  <Alert severity={message.type} onClose={() => setMessage(null)}>
                    {message.text}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  size="large"
                  startIcon={<DownloadIcon />}
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? 'Exporting...' : 'Export Data'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data Summary
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">Organizations: {organizations ?? 0}</Typography>
                <Typography variant="body2">Sites: {sites ?? 0}</Typography>
                <Typography variant="body2">Locations: {locations ?? 0}</Typography>
                <Typography variant="body2">Equipment: {equipment ?? 0}</Typography>
                <Typography variant="body2">Events: {events ?? 0}</Typography>
                <Typography variant="body2">Images: {images ?? 0}</Typography>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="error">
                Danger Zone
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Clear all data from the local database. This action cannot be undone.
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<StorageIcon />}
                onClick={handleClearData}
              >
                Clear All Data
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
