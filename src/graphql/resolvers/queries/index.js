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
import { fieldResolvers as scheduleDownload } from './scheduleDownload';
import { fieldResolvers as eventAcceptedSpeakerFields } from './eventAcceptedSpeaker';
import { fieldResolvers as eventAdminFields } from './eventAdmin';
import { fieldResolvers as acceptedSpeakerFields } from './acceptedSpeaker';
import { fieldResolvers as eventDestinationsFields } from './eventDestinations';
import { fieldResolvers as eventDestinationFields } from './eventDestination';
import { fieldResolvers as partnerFields } from './partner';
import { fieldResolvers as partnerSponsoredEventFields } from './partnerSponsorEvents';

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
  ...scheduleDownload,
  ...eventAcceptedSpeakerFields,
  ...eventAdminFields,
  ...acceptedSpeakerFields,
  ...eventDestinationsFields,
  ...eventDestinationFields,
  ...partnerFields,
  ...partnerSponsoredEventFields,
};
