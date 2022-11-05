import { QueryModifier } from 'types/generalTypes';

/**
 * Model Event
 *
 */
export type Event = {
  id: number;
  name: string;
  duration: number;
  startTime: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Model Guest
 *
 */
export type Guest = {
  id: number;
  fans: number;
  name: string;
  vip: boolean;
  createdAt: Date;
  updatedAt: Date;
  eventId: number;
  eventSignupId: number | null;
};

/**
 * Model EventCategory
 *
 */
export type EventCategory = {
  id: number;
  name: string;
};

const eventQueryModifier: QueryModifier<Event> = {
  numericValues: ['id', 'duration'],
};
const guestQueryModifier: QueryModifier<Guest> = {
  numericValues: ['id', 'fans', 'eventId', 'eventSignupId'],
  booleanValues: ['vip'],
};

const eventCategoryQueryModifier: QueryModifier<EventCategory> = {
  numericValues: ['id'],
};

const queryModifiers = {
  events: eventQueryModifier,
  guests: guestQueryModifier,
  eventCategories: eventCategoryQueryModifier,
};
export default queryModifiers;
