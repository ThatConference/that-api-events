import rootMutations from './root';

import { fieldResolvers as eventsFields } from './events';
import { fieldResolvers as eventFields } from './event';

import { fieldResolvers as milestonesFields } from './milestones';
import { fieldResolvers as milestoneFields } from './milestone';

import { fieldResolvers as notificationsFields } from './notifications';
import { fieldResolvers as notificationFields } from './notification';

import { fieldResolvers as venuesFields } from './venues';
import { fieldResolvers as venueFields } from './venue';

import { fieldResolvers as eventPartner } from './eventPartner';

import { fieldResolvers as communitiesFields } from './communities';
import { fieldResolvers as communityFields } from './community';

import { fieldResolvers as communityFavoriting } from './communityFavoriting';
import { fieldResolvers as eventFavoriting } from './eventFavoriting';

import { fieldResolvers as eventProductFields } from './eventProduct';

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
  ...eventPartner,
  ...communitiesFields,
  ...communityFields,
  ...communityFavoriting,
  ...eventFavoriting,
  ...eventProductFields,
};
