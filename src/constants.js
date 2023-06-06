import { constants as apiConstants } from '@thatconference/api';

const constants = {
  ...apiConstants,
};

constants.THAT.USER_EVENTS = {
  REGISTRATION_CHECKIN: 'registrationCheckIn',
  SPEAKER_ENROLLMENT_COMPLETE: 'speakerEnrollmentComplete',
};

constants.THAT.PARTNERS = {
  SPONSOR_EXPIRATION_DAYS: 30,
};

export default constants;
