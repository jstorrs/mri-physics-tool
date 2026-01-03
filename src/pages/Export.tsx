import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { db } from '../db';

export default function Export() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);

  // Data counts
  const organizations = useLiveQuery(() => db.organizations.count());
  const sites = useLiveQuery(() => db.sites.count());
  const rooms = useLiveQuery(() => db.rooms.count());
  const equipment = useLiveQuery(() => db.equipment.count());
  const events = useLiveQuery(() => db.events.count());
  const images = useLiveQuery(() => db.images.count());

  const handleExportJSON = async () => {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      organizations: await db.organizations.toArray(),
      sites: await db.sites.toArray(),
      rooms: await db.rooms.toArray(),
      equipment: await db.equipment.toArray(),
      events: await db.events.toArray(),
      // Images excluded by default (large)
    };

    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mri-physics-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setMessage('Export completed!');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleClearData = async () => {
    await db.organizations.clear();
    await db.sites.clear();
    await db.rooms.clear();
    await db.equipment.clear();
    await db.events.clear();
    await db.images.clear();
    await db.timelines.clear();

    setMessage('All data cleared.');
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <>
      <header className="drill-header">
        <button className="drill-header__back" onClick={() => navigate('/')}>
          ‹
        </button>
        <h1 className="drill-header__title">Export</h1>
      </header>

      <div style={{ padding: 'var(--space-4)' }}>
        {/* Data Summary */}
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>
            Data Summary
          </h2>
          <div style={{
            border: 'var(--border-width) solid var(--color-border)',
            padding: 'var(--space-4)'
          }}>
            <p>Organizations: {organizations ?? 0}</p>
            <p>Sites: {sites ?? 0}</p>
            <p>Rooms: {rooms ?? 0}</p>
            <p>Equipment: {equipment ?? 0}</p>
            <p>Events: {events ?? 0}</p>
            <p>Images: {images ?? 0}</p>
          </div>
        </section>

        {/* Export */}
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>
            Export Data
          </h2>
          <button className="btn" onClick={handleExportJSON}>
            Export as JSON
          </button>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 style={{
            fontSize: 'var(--text-lg)',
            marginBottom: 'var(--space-3)',
            color: 'var(--color-danger)'
          }}>
            Danger Zone
          </h2>
          <AlertDialog.Root>
            <AlertDialog.Trigger asChild>
              <button className="btn btn--danger">
                Clear All Data
              </button>
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Overlay className="alert-dialog-overlay" />
              <AlertDialog.Content className="alert-dialog-content">
                <AlertDialog.Title className="alert-dialog-title">
                  Clear All Data?
                </AlertDialog.Title>
                <AlertDialog.Description className="alert-dialog-description">
                  This will permanently delete all organizations, sites, rooms, equipment,
                  events, and images. This action cannot be undone.
                </AlertDialog.Description>
                <div className="alert-dialog-actions">
                  <AlertDialog.Cancel asChild>
                    <button className="btn">Cancel</button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <button className="btn btn--danger" onClick={handleClearData}>
                      Delete Everything
                    </button>
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        </section>

        {/* Message */}
        {message && (
          <div style={{
            position: 'fixed',
            bottom: 'var(--space-4)',
            left: 'var(--space-4)',
            right: 'var(--space-4)',
            padding: 'var(--space-3)',
            background: 'var(--color-border)',
            color: 'var(--color-bg)',
            textAlign: 'center',
          }}>
            {message}
          </div>
        )}
      </div>
    </>
  );
}
