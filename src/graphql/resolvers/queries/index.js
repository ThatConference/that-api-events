import root from './root';
import { fieldResolvers as eventFields } from './event';
import { fieldResolvers as eventsFields } from './events';
import { fieldResolvers as venuesFields } from './venues';
import { fieldResolvers as venueFields } from './venue';
import { fieldResolvers as eventPartnerFields } from './partners';
import { fieldResolvers as communityFields } from './community';
import { fieldResolvers as communitiesFields } from './communities';
import { fieldResolvers as communityStatsFields } from './communityStats';
import { fieldResolvers as meCommunityFields } from './meCommunity';
import { fieldResolvers as meCommunityFavFields } from './meCommunityFavorites';
import { fieldResolvers as meEventFields } from './meEvent';
import { fieldResolvers as meEventFavFields } from './meEventFavorites';
import { fieldResolvers as meEventAccessFields } from './meEventAccess';
import { fieldResolvers as registrationQueryFields } from './registration';

export default {
  ...root,
};

export const fieldResolvers = {
  ...eventFields,
  ...eventsFields,
  ...venuesFields,
  ...venueFields,
  ...eventPartnerFields,
  ...communityFields,
  ...communitiesFields,
  ...communityStatsFields,
  ...meCommunityFields,
  ...meCommunityFavFields,
  ...meEventFields,
  ...meEventFavFields,
  ...meEventAccessFields,
  ...registrationQueryFields,
};
