import Dexie, { type EntityTable } from 'dexie';
import type {
  Organization,
  Site,
  Room,
  Equipment,
  SupportEvent,
  GalleryImage,
  Timeline,
} from '../types';

class MRIPhysicsDB extends Dexie {
  organizations!: EntityTable<Organization, 'id'>;
  sites!: EntityTable<Site, 'id'>;
  rooms!: EntityTable<Room, 'id'>;
  equipment!: EntityTable<Equipment, 'id'>;
  events!: EntityTable<SupportEvent, 'id'>;
  images!: EntityTable<GalleryImage, 'id'>;
  timelines!: EntityTable<Timeline, 'id'>;

  constructor() {
    super('MRIPhysicsDB');

    // Version 1: Original schema (locations only)
    this.version(1).stores({
      locations: 'id, name, createdAt',
      equipment: 'id, locationId, name, manufacturer, model, status, createdAt',
      events: 'id, equipmentId, locationId, type, status, scheduledDate, createdAt',
      images: 'id, eventId, equipmentId, locationId, capturedAt, *tags',
      timelines: 'id, eventId, createdAt',
    });

    // Version 2: Added organizations and sites
    this.version(2).stores({
      organizations: 'id, name, createdAt',
      sites: 'id, organizationId, name, createdAt',
      locations: 'id, siteId, name, createdAt',
      equipment: 'id, locationId, type, name, manufacturer, model, status, createdAt',
      events: 'id, equipmentId, locationId, type, status, scheduledDate, createdAt',
      images: 'id, eventId, equipmentId, locationId, capturedAt, *tags',
      timelines: 'id, eventId, createdAt',
    });

    // Version 3: Rename locations -> rooms, locationId -> roomId
    this.version(3).stores({
      organizations: 'id, name, createdAt',
      sites: 'id, organizationId, name, createdAt',
      rooms: 'id, siteId, name, createdAt',
      locations: null, // Delete old table
      equipment: 'id, roomId, type, name, manufacturer, model, status, createdAt',
      events: 'id, equipmentId, roomId, type, status, scheduledDate, createdAt',
      images: 'id, eventId, equipmentId, roomId, capturedAt, *tags',
      timelines: 'id, eventId, createdAt',
    }).upgrade(async tx => {
      // Migrate locations -> rooms
      const locations = await tx.table('locations').toArray();
      if (locations.length > 0) {
        await tx.table('rooms').bulkAdd(locations);
      }

      // Migrate equipment: locationId -> roomId
      await tx.table('equipment').toCollection().modify(item => {
        if ('locationId' in item) {
          item.roomId = item.locationId;
          delete item.locationId;
        }
      });

      // Migrate events: locationId -> roomId
      await tx.table('events').toCollection().modify(item => {
        if ('locationId' in item) {
          item.roomId = item.locationId;
          delete item.locationId;
        }
      });

      // Migrate images: locationId -> roomId
      await tx.table('images').toCollection().modify(item => {
        if ('locationId' in item) {
          item.roomId = item.locationId;
          delete item.locationId;
        }
      });
    });
  }
}

export const db = new MRIPhysicsDB();

// Helper functions for common operations
export async function getRoomWithEquipment(roomId: string) {
  const room = await db.rooms.get(roomId);
  if (!room) return null;
  const equipment = await db.equipment.where('roomId').equals(roomId).toArray();
  return { room, equipment };
}

export async function getEquipmentWithEvents(equipmentId: string) {
  const equipment = await db.equipment.get(equipmentId);
  if (!equipment) return null;
  const events = await db.events.where('equipmentId').equals(equipmentId).toArray();
  return { equipment, events };
}

export async function getEventWithImages(eventId: string) {
  const event = await db.events.get(eventId);
  if (!event) return null;
  const images = await db.images.where('eventId').equals(eventId).toArray();
  const timelines = await db.timelines.where('eventId').equals(eventId).toArray();
  return { event, images, timelines };
}

export async function getImagesForTimeline(timelineId: string) {
  const timeline = await db.timelines.get(timelineId);
  if (!timeline) return null;
  const images = await db.images.where('id').anyOf(timeline.imageIds).toArray();
  return { timeline, images };
}

export async function getOrganizationWithSites(organizationId: string) {
  const organization = await db.organizations.get(organizationId);
  if (!organization) return null;
  const sites = await db.sites.where('organizationId').equals(organizationId).toArray();
  return { organization, sites };
}

export async function getSiteWithRooms(siteId: string) {
  const site = await db.sites.get(siteId);
  if (!site) return null;
  const rooms = await db.rooms.where('siteId').equals(siteId).toArray();
  return { site, rooms };
}
