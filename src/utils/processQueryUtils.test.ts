import qs from 'querystring';

import {
  parseValue,
  processExpandString,
  processFiltering,
  processFindAllQuery,
  processRelationships,
  regExpForParsingSpecialValues,
  supportNestedKey,
  transformDotKeysIntoNestedKeys,
} from './processQueryUtils';
import queryModifiers from './queryModifiers';

// below are tests as well as documentation for findAllQuery
describe('overall', () => {
  const routeToFindManyArgs = {
    '/events?id=6&id=7': { where: { id: { in: [6, 7] } } },

    // expand guests for John
    '/events?_expand=guests&guests.name_like=John': {
      include: {
        guests: {
          where: { name: { contains: 'John', mode: 'insensitive' } },
        },
      },
    },

    // expand guests whose vip is false
    '/events?_expand=guests&guests.vip=bool(false)': {
      include: { guests: { where: { vip: false } } },
    },

    // below means get all events for which host name is like Hitesh
    // filter for hosts didn't got transferred since _expand is after filter
    '/events?hosts.every.name_like=Hitesh&_expand=hosts': {
      where: {
        hosts: { every: { name: { contains: 'Hitesh', mode: 'insensitive' } } },
      },
      include: {
        hosts: true,
      },
    },

    // in below case we are expanding hosts (before applying the filter), so it is interpreted as get all the events
    // and get all hosts whose name is like Hitesh (filter got transferred to child)
    '/events?_expand=hosts&hosts.name_like=Hitesh': {
      include: {
        hosts: { where: { name: { contains: 'Hitesh', mode: 'insensitive' } } },
      },
    },

    // multiple filters for nested models
    '/events?_expand=guests&guests.name_like=Rahul&guests.vip=bool(true)': {
      include: {
        guests: {
          where: {
            vip: true,
            name: { contains: 'Rahul', mode: 'insensitive' },
          },
        },
      },
    },

    // ne -> not equal
    '/guests?eventSignupId_ne=null': {
      where: { eventSignupId: { not: null } },
    },

    // expand multiple models for nested model
    '/eventCategories?_expand=events.hosts&_expand=events.eventMetadata': {
      include: {
        events: { include: { eventMetadata: true, hosts: true } },
      },
    },

    '/events?_sort=startTime&_sort=id&_order=asc': {
      orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
    },

    // id by default took asc, (, separation is supported for both _sort and _order)
    '/events?_sort=duration,id&_order=desc': {
      orderBy: [{ duration: 'desc' }, { id: 'asc' }],
    },

    '/guests?_page=2&_limit=5': { skip: 5, take: 5 },

    // _start and _end work like indexes
    '/guests?_start=0&_end=10': {
      skip: 0,
      take: 10,
    },

    // for nested numbers wrap number inside num()
    // although that is not required at first level, since that is taken care off by queryModifier see below example
    '/events?_expand=guests&guests.fans_gt=num(21000)': {
      include: { guests: { where: { fans: { gt: 21000 } } } },
    },

    // fans is treated as number already because of guestQueryModifier
    /*
      const guestQueryModifier: QueryModifier<Guest> = {
        numericValues: ['id', 'fans', 'eventId', 'eventSignupId'],
        booleanValues: ['vip'],
      };
    */
    // so no need of writing fans_gt=num(21000)
    '/guests?eventId=1&fans_gt=21000': {
      where: { eventId: 1, fans: { gt: 21000 } },
    },
  };
  for (const route in routeToFindManyArgs) {
    test(route, () => {
      const questionMarkIndex = route.indexOf('?');
      const endpoint = route.slice(1, questionMarkIndex);
      const query = route.slice(questionMarkIndex + 1, route.length);
      const parsedQuery = qs.parse(query);
      const value =
        routeToFindManyArgs[route as keyof typeof routeToFindManyArgs];
      const queryModifier =
        queryModifiers[endpoint as keyof typeof queryModifiers];
      expect(queryModifier).toBeDefined();
      expect(processFindAllQuery(parsedQuery, queryModifier)).toEqual(value);
    });
  }
});

describe('processExpandString', () => {
  test('basic', () => {
    expect(processExpandString('events')).toEqual({
      include: {
        events: true,
      },
    });
    expect(processExpandString('events.eventCategories')).toEqual({
      include: {
        events: {
          include: {
            eventCategories: true,
          },
        },
      },
    });
    expect(processExpandString('events.eventCategories.events')).toEqual({
      include: {
        events: {
          include: {
            eventCategories: {
              include: {
                events: true,
              },
            },
          },
        },
      },
    });
  });
});

describe('processRelationships', () => {
  test('basic', () => {
    expect(processRelationships('events')).toEqual({
      events: true,
    });
    expect(processRelationships('users,posts.comments')).toEqual({
      users: true,
      posts: {
        include: {
          comments: true,
        },
      },
    });
    expect(
      processRelationships([
        'events.eventCategories',
        'hosts',
        'users,posts.comments',
      ])
    ).toEqual({
      events: {
        include: {
          eventCategories: true,
        },
      },
      hosts: true,
      users: true,
      posts: {
        include: {
          comments: true,
        },
      },
    });
  });

  test('multiple expands on same entity', () => {
    expect(
      processRelationships(['events.hosts', 'events.eventMetadata'])
    ).toEqual({
      events: {
        include: {
          hosts: true,
          eventMetadata: true,
        },
      },
    });
  });
});

describe('performModificationsAccordingToQueryModifier', () => {
  const queryModifier = {
    numericValues: ['id'],
    booleanValues: ['vip'],
  };
  test('numeric', () => {
    expect(
      parseValue({
        key: 'id',
        value: '1',
        queryModifier: queryModifier,
      })
    ).toBe(1);
  });
  test('boolean', () => {
    expect(
      parseValue({
        key: 'vip',
        value: 'true',
        queryModifier: queryModifier,
      })
    ).toBe(true);
    expect(
      parseValue({
        key: 'vip',
        value: 'false',
        queryModifier: queryModifier,
      })
    ).toBe(false);
  });
  test('if not in queryModifier then returns string except when null', () => {
    expect(
      parseValue({
        key: 'name',
        value: 'Rahul',
        queryModifier: queryModifier,
      })
    ).toBe('Rahul');
    expect(
      parseValue({
        key: 'uuid',
        value: 'null',
        queryModifier: queryModifier,
      })
    ).toBe(null);
  });
});

describe('processFiltering', () => {
  test('basic', () => {
    expect(
      processFiltering(
        {
          id: '1',
        },
        {
          numericValues: ['id'],
        }
      )
    ).toEqual({
      id: 1,
    });
  });
  test('array works', () => {
    expect(
      processFiltering(
        {
          id: ['1', '2'],
        },
        {
          numericValues: ['id'],
        }
      )
    ).toEqual({
      id: {
        in: [1, 2],
      },
    });
  });

  describe('transformDotKeysIntoNestedKeys', () => {
    describe('supportNestedKey', () => {
      test('basic', () => {
        expect(supportNestedKey('id', 1)).toEqual({
          id: 1,
        });
        expect(supportNestedKey('eventSchedule.type', 'festive')).toEqual({
          eventSchedule: {
            type: 'festive',
          },
        });
      });
    });

    test('basic', () => {
      expect(
        transformDotKeysIntoNestedKeys({
          'eventSchedule.type': 'festive',
        })
      ).toEqual({
        eventSchedule: {
          type: 'festive',
        },
      });
    });
  });

  test('nested filtering string value', () => {
    expect(processFiltering({ 'eventSchedule.type': 'festive' })).toEqual({
      eventSchedule: {
        type: 'festive',
      },
    });
  });
  test('nested filtering array value', () => {
    expect(
      processFiltering({
        'eventSchedule.type': ['festive', 'immediate'],
      })
    ).toEqual({
      eventSchedule: {
        type: {
          in: ['festive', 'immediate'],
        },
      },
    });
  });
});

describe('regExpForParsingSpecialValues', () => {
  test('bool', () => {
    expect(regExpForParsingSpecialValues.bool.test('bool(true)')).toBe(true);
    expect(regExpForParsingSpecialValues.bool.test('bool(false)')).toBe(true);
    expect(regExpForParsingSpecialValues.bool.test('bool(fsdfsd)')).toBe(false);
    expect(regExpForParsingSpecialValues.bool.test('bool(321)')).toBe(false);
    expect(regExpForParsingSpecialValues.bool.test(' bool(true)')).toBe(false);
  });
  test('int', () => {
    expect(regExpForParsingSpecialValues.num.test('num(12)')).toBe(true);
    expect(regExpForParsingSpecialValues.num.test('num(abc)')).toBe(false);
    expect(regExpForParsingSpecialValues.num.test('num(132abc)')).toBe(false);
    expect(regExpForParsingSpecialValues.num.test(' num(12)')).toBe(false);
  });
});
