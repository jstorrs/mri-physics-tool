import { useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import * as Dialog from '@radix-ui/react-dialog';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
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

const LONG_PRESS_DURATION = 500;

export default function Sites() {
  const navigate = useNavigate();
  const { orgId } = useParams<{ orgId: string }>();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SiteFormData>(emptyForm);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Site | null>(null);

  // Long-press handling
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const [contextMenuSite, setContextMenuSite] = useState<Site | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  // Data
  const organization = useLiveQuery(
    () => orgId ? db.organizations.get(orgId) : undefined,
    [orgId]
  );

  const sites = useLiveQuery(
    () => orgId ? db.sites.where('organizationId').equals(orgId).sortBy('name') : [],
    [orgId]
  );

  // Clear long-press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent, site: Site) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    longPressTimer.current = setTimeout(() => {
      setContextMenuSite(site);
      setContextMenuPos({ x: touch.clientX, y: touch.clientY });
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

  // Navigation
  const handleBack = () => {
    navigate('/');
  };

  const handleItemClick = (site: Site) => {
    if (contextMenuSite) return;
    navigate(`/organizations/${orgId}/sites/${site.id}/rooms`);
  };

  // Dialog handlers
  const openAddDialog = () => {
    setEditingId(null);
    setFormData({ ...emptyForm, organizationId: orgId || '' });
    setDialogOpen(true);
  };

  const openEditDialog = (site: Site) => {
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
    setDialogOpen(true);
    setContextMenuSite(null);
  };

  const handleSave = async () => {
    const now = new Date();
    if (editingId) {
      await db.sites.update(editingId, {
        ...formData,
        updatedAt: now,
      });
    } else {
      await db.sites.add({
        id: uuidv4(),
        ...formData,
        createdAt: now,
        updatedAt: now,
      });
    }
    setDialogOpen(false);
  };

  // Delete handlers
  const handleDeleteClick = (site: Site) => {
    setDeleteTarget(site);
    setContextMenuSite(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    // Cascade delete
    const rooms = await db.rooms.where('siteId').equals(deleteTarget.id).toArray();
    const roomIds = rooms.map(r => r.id);

    await db.images.where('roomId').anyOf(roomIds).delete();
    await db.events.where('roomId').anyOf(roomIds).delete();
    await db.equipment.where('roomId').anyOf(roomIds).delete();
    await db.rooms.where('siteId').equals(deleteTarget.id).delete();
    await db.sites.delete(deleteTarget.id);

    setDeleteTarget(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const headerTitle = organization?.shortName || organization?.name || 'Sites';

  return (
    <>
      {/* Header */}
      <header className="drill-header">
        <button className="drill-header__back" onClick={handleBack}>
          ‹
        </button>
        <h1 className="drill-header__title">{headerTitle}</h1>
      </header>

      {/* List */}
      <div className="drill-list">
        {sites?.map(site => (
          <ContextMenu.Root key={site.id}>
            <ContextMenu.Trigger asChild>
              <div
                className="drill-item"
                onClick={() => handleItemClick(site)}
                onTouchStart={e => handleTouchStart(e, site)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <span className="drill-item__text">{site.name}</span>
                <span className="drill-item__chevron">›</span>
              </div>
            </ContextMenu.Trigger>

            <ContextMenu.Portal>
              <ContextMenu.Content className="context-menu-content">
                <ContextMenu.Item
                  className="context-menu-item"
                  onSelect={() => openEditDialog(site)}
                >
                  Edit
                </ContextMenu.Item>
                <ContextMenu.Item
                  className="context-menu-item"
                  onSelect={() => {/* TODO: Export */}}
                >
                  Export
                </ContextMenu.Item>
                <ContextMenu.Item
                  className="context-menu-item context-menu-item--danger"
                  onSelect={() => handleDeleteClick(site)}
                >
                  Delete
                </ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu.Portal>
          </ContextMenu.Root>
        ))}

        {/* Add Site */}
        <div className="drill-item drill-item--add" onClick={openAddDialog}>
          <span className="drill-item__text">+ Add Site</span>
        </div>
      </div>

      {/* Mobile long-press context menu */}
      {contextMenuSite && (
        <div
          className="context-menu-content"
          style={{
            position: 'fixed',
            top: contextMenuPos.y,
            left: contextMenuPos.x,
          }}
        >
          <div className="context-menu-item" onClick={() => openEditDialog(contextMenuSite)}>
            Edit
          </div>
          <div className="context-menu-item" onClick={() => {/* TODO: Export */}}>
            Export
          </div>
          <div
            className="context-menu-item context-menu-item--danger"
            onClick={() => handleDeleteClick(contextMenuSite)}
          >
            Delete
          </div>
          <div className="context-menu-item" onClick={() => setContextMenuSite(null)}>
            Cancel
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <Dialog.Title className="dialog-title">
              {editingId ? 'Edit Site' : 'Add Site'}
            </Dialog.Title>

            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Site Name *
              </label>
              <input
                id="name"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="address">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                className="form-input"
                rows={2}
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contactName">
                Contact Name
              </label>
              <input
                id="contactName"
                name="contactName"
                className="form-input"
                value={formData.contactName}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contactPhone">
                Contact Phone
              </label>
              <input
                id="contactPhone"
                name="contactPhone"
                className="form-input"
                type="tel"
                value={formData.contactPhone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="contactEmail">
                Contact Email
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                className="form-input"
                type="email"
                value={formData.contactEmail}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="notes">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                className="form-input"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
              />
            </div>

            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button type="button" className="btn">Cancel</button>
              </Dialog.Close>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSave}
                disabled={!formData.name.trim()}
              >
                Save
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation */}
      <AlertDialog.Root open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="alert-dialog-overlay" />
          <AlertDialog.Content className="alert-dialog-content">
            <AlertDialog.Title className="alert-dialog-title">
              Delete Site?
            </AlertDialog.Title>
            <AlertDialog.Description className="alert-dialog-description">
              This will delete all rooms, equipment, and events for "{deleteTarget?.name}".
              This action cannot be undone.
            </AlertDialog.Description>
            <div className="alert-dialog-actions">
              <AlertDialog.Cancel asChild>
                <button className="btn">Cancel</button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button className="btn btn--danger" onClick={handleDeleteConfirm}>
                  Delete
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
