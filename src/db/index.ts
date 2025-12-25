import Dexie, { type EntityTable } from 'dexie';
import type {
  Location,
  Equipment,
  SupportEvent,
  GalleryImage,
  Timeline,
} from '../types';

class MRIPhysicsDB extends Dexie {
  locations!: EntityTable<Location, 'id'>;
  equipment!: EntityTable<Equipment, 'id'>;
  events!: EntityTable<SupportEvent, 'id'>;
  images!: EntityTable<GalleryImage, 'id'>;
  timelines!: EntityTable<Timeline, 'id'>;

  constructor() {
    super('MRIPhysicsDB');

    this.version(1).stores({
      locations: 'id, name, createdAt',
      equipment: 'id, locationId, name, manufacturer, model, status, createdAt',
      events: 'id, equipmentId, locationId, type, status, scheduledDate, createdAt',
      images: 'id, eventId, equipmentId, locationId, capturedAt, *tags',
      timelines: 'id, eventId, createdAt',
    });
  }
}

export const db = new MRIPhysicsDB();

// Helper functions for common operations
export async function getLocationWithEquipment(locationId: string) {
  const location = await db.locations.get(locationId);
  if (!location) return null;
  const equipment = await db.equipment.where('locationId').equals(locationId).toArray();
  return { location, equipment };
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
