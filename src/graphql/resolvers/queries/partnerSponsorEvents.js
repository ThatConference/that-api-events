export const fieldResolvers = {
  PartnerSponsorEvents: {
    future: eventList => eventList.filter(el => el.endDate >= new Date()),
    past: eventList => eventList.filter(el => el.endDate < new Date()),
    all: eventList => eventList,
  },
};
