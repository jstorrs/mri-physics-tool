// Core entity types for MRI Physics Tool

export interface Organization {
  id: string;
  name: string;
  shortName?: string;  // For display in drill-down lists
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Site {
  id: string;
  organizationId: string;
  name: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  siteId: string;
  name: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EquipmentType = 'mri_scanner' | 'coil' | 'phantom' | 'workstation' | 'other';

export interface Equipment {
  id: string;
  roomId: string;
  type: EquipmentType;
  name: string;
  manufacturer: string;
  model?: string;
  serialNumber?: string;
  fieldStrength?: string; // e.g., "1.5T", "3T"
  installDate?: Date;
  softwareVersion?: string;
  serviceContractExpiry?: Date;
  status: 'active' | 'inactive' | 'decommissioned';
  customFields?: Record<string, string>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type EventType =
  | 'acr_test'
  | 'qc_check'
  | 'acceptance_test'
  | 'annual_survey'
  | 'repair'
  | 'calibration'
  | 'incident'
  | 'service_call'
  | 'consultation'
  | 'other';

export type EventStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface SupportEvent {
  id: string;
  equipmentId: string;
  roomId: string;
  type: EventType;
  status: EventStatus;
  title: string;
  description?: string;
  scheduledDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  findings?: string;
  recommendations?: string;
  customFields?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GalleryImage {
  id: string;
  eventId?: string;
  equipmentId?: string;
  roomId?: string;
  filename: string;
  mimeType: string;
  blob: Blob;
  thumbnailBlob?: Blob;
  caption?: string;
  tags?: string[];
  capturedAt: Date;
  createdAt: Date;
}

export interface Timeline {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  imageIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Form types
export type OrganizationFormData = Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>;
export type SiteFormData = Omit<Site, 'id' | 'createdAt' | 'updatedAt'>;
export type RoomFormData = Omit<Room, 'id' | 'createdAt' | 'updatedAt'>;
export type EquipmentFormData = Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>;
export type SupportEventFormData = Omit<SupportEvent, 'id' | 'createdAt' | 'updatedAt'>;

// Export types
export interface ExportOptions {
  format: 'json' | 'csv';
  includeImages: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}
