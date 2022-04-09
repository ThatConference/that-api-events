import { constants as apiConstants } from '@thatconference/api';

const constants = {
  ...apiConstants,
};

constants.THAT.USER_EVENTS = {
  REGISTRATION_CHECKIN: 'registrationCheckIn',
  SPEAKER_ENROLLMENT_COMPLETE: 'speakerEnrollmentComplete',
};

export default constants;
