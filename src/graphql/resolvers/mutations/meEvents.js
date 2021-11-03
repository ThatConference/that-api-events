import debug from 'debug';
import demoStore from '../../../dataSources/cloudFirestore/demoResponses';

const dlog = debug('that:api:events:mutations');

export const fieldResolvers = {
  MeEventsMutation: {
    favoriting: ({ eventId, slug }) => {
      dlog('favoriting %o', slug);
      return { eventId };
    },
    speaker: ({ eventId }) => ({ eventId }),
    saveDemos: (
      { eventId },
      { responses },
      { dataSources: { firestore }, user },
    ) => {
      dlog(
        'save demographic responses for user %s on event %s',
        user.sub,
        eventId,
      );
      const result = {
        success: false,
        message: '',
      };

      if (!Array.isArray(responses)) {
        result.message = 'responses must be in the form of an array';
        return result;
      }

      return demoStore(firestore)
        .saveResponses({
          eventId,
          memberId: user.sub,
          responses,
        })
        .then(() => {
          result.message = `successfuly saved demographic question responses.`;
          result.success = true;
          return result;
        });
    },
  },
};
