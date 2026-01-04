import { useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import * as Dialog from '@radix-ui/react-dialog';
import * as ContextMenu from '@radix-ui/react-context-menu';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { db } from '../db';
import type { Room, RoomFormData } from '../types';

const emptyForm: RoomFormData = {
  siteId: '',
  name: '',
  address: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  notes: '',
};

const LONG_PRESS_DURATION = 500;

export default function Rooms() {
  const navigate = useNavigate();
  const { orgId, siteId } = useParams<{ orgId: string; siteId: string }>();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RoomFormData>(emptyForm);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);

  // Long-press handling
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const [contextMenuRoom, setContextMenuRoom] = useState<Room | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  // Data
  const site = useLiveQuery(
    () => siteId ? db.sites.get(siteId) : undefined,
    [siteId]
  );

  const rooms = useLiveQuery(
    () => siteId ? db.rooms.where('siteId').equals(siteId).sortBy('name') : [],
    [siteId]
  );

  // Clear long-press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent, room: Room) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    longPressTimer.current = setTimeout(() => {
      setContextMenuRoom(room);
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
    navigate(`/organizations/${orgId}/sites`);
  };

  const handleItemClick = (room: Room) => {
    if (contextMenuRoom) return;
    navigate(`/organizations/${orgId}/sites/${siteId}/rooms/${room.id}`);
  };

  // Dialog handlers
  const openAddDialog = () => {
    setEditingId(null);
    setFormData({ ...emptyForm, siteId: siteId || '' });
    setDialogOpen(true);
  };

  const openEditDialog = (room: Room) => {
    setEditingId(room.id);
    setFormData({
      siteId: room.siteId,
      name: room.name,
      address: room.address || '',
      contactName: room.contactName || '',
      contactPhone: room.contactPhone || '',
      contactEmail: room.contactEmail || '',
      notes: room.notes || '',
    });
    setDialogOpen(true);
    setContextMenuRoom(null);
  };

  const handleSave = async () => {
    const now = new Date();
    if (editingId) {
      await db.rooms.update(editingId, {
        ...formData,
        updatedAt: now,
      });
    } else {
      await db.rooms.add({
        id: uuidv4(),
        ...formData,
        createdAt: now,
        updatedAt: now,
      });
    }
    setDialogOpen(false);
  };

  // Delete handlers
  const handleDeleteClick = (room: Room) => {
    setDeleteTarget(room);
    setContextMenuRoom(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    // Cascade delete
    await db.images.where('roomId').equals(deleteTarget.id).delete();
    await db.events.where('roomId').equals(deleteTarget.id).delete();
    await db.equipment.where('roomId').equals(deleteTarget.id).delete();
    await db.rooms.delete(deleteTarget.id);

    setDeleteTarget(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const headerTitle = site?.name || 'Rooms';

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
        {rooms?.map(room => (
          <ContextMenu.Root key={room.id}>
            <ContextMenu.Trigger asChild>
              <div
                className="drill-item"
                onClick={() => handleItemClick(room)}
                onTouchStart={e => handleTouchStart(e, room)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <span className="drill-item__text">{room.name}</span>
                <span className="drill-item__chevron">›</span>
              </div>
            </ContextMenu.Trigger>

            <ContextMenu.Portal>
              <ContextMenu.Content className="context-menu-content">
                <ContextMenu.Item
                  className="context-menu-item"
                  onSelect={() => openEditDialog(room)}
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
                  onSelect={() => handleDeleteClick(room)}
                >
                  Delete
                </ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu.Portal>
          </ContextMenu.Root>
        ))}

        {/* Add Room */}
        <div className="drill-item drill-item--add" onClick={openAddDialog}>
          <span className="drill-item__text">+ Add Room</span>
        </div>
      </div>

      {/* Mobile long-press context menu */}
      {contextMenuRoom && (
        <div
          className="context-menu-content"
          style={{
            position: 'fixed',
            top: contextMenuPos.y,
            left: contextMenuPos.x,
          }}
        >
          <div className="context-menu-item" onClick={() => openEditDialog(contextMenuRoom)}>
            Edit
          </div>
          <div className="context-menu-item" onClick={() => {/* TODO: Export */}}>
            Export
          </div>
          <div
            className="context-menu-item context-menu-item--danger"
            onClick={() => handleDeleteClick(contextMenuRoom)}
          >
            Delete
          </div>
          <div className="context-menu-item" onClick={() => setContextMenuRoom(null)}>
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
              {editingId ? 'Edit Room' : 'Add Room'}
            </Dialog.Title>

            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Room Name *
              </label>
              <input
                id="name"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., MRI Room 1, Scanner Bay A"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="address">
                Location Details
              </label>
              <textarea
                id="address"
                name="address"
                className="form-input"
                rows={2}
                value={formData.address}
                onChange={handleChange}
                placeholder="e.g., Building B, Floor 2"
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
              Delete Room?
            </AlertDialog.Title>
            <AlertDialog.Description className="alert-dialog-description">
              This will delete all equipment and events for "{deleteTarget?.name}".
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
