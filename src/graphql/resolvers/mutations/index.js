import rootMutations from './root';

import { fieldResolvers as eventsFields } from './events';
import { fieldResolvers as eventFields } from './event';

import { fieldResolvers as milestonesFields } from './milestones';
import { fieldResolvers as milestoneFields } from './milestone';

import { fieldResolvers as notificationsFields } from './notifications';
import { fieldResolvers as notificationFields } from './notification';

import { fieldResolvers as venuesFields } from './venues';
import { fieldResolvers as venueFields } from './venue';
import { fieldResolvers as venueRoomsFields } from './venueRooms';
import { fieldResolvers as venueRoomFields } from './venueRoom';

import { fieldResolvers as eventPartner } from './eventPartner';

import { fieldResolvers as communitiesFields } from './communities';
import { fieldResolvers as communityFields } from './community';

import { fieldResolvers as communityFavoriting } from './communityFavoriting';
import { fieldResolvers as eventFavoriting } from './eventFavoriting';

import { fieldResolvers as eventProductFields } from './eventProduct';

import { fieldResolvers as registrationFields } from './registration';
import { fieldResolvers as eventSpeakerFields } from './eventSpeaker';
import { fieldResolvers as meEventsFields } from './meEvents';

export default {
  ...rootMutations,
};

export const fieldResolvers = {
  ...eventsFields,
  ...eventFields,
  ...milestonesFields,
  ...milestoneFields,
  ...notificationsFields,
  ...notificationFields,
  ...venuesFields,
  ...venueFields,
  ...venueRoomsFields,
  ...venueRoomFields,
  ...eventPartner,
  ...communitiesFields,
  ...communityFields,
  ...communityFavoriting,
  ...eventFavoriting,
  ...eventProductFields,
  ...registrationFields,
  ...eventSpeakerFields,
  ...meEventsFields,
};
