# prisma-query

convert query params to prisma args

## Usage

### processFindAllQuery

```typescript
import { processFindAllQuery } from 'prisma-query';

const req = {
  query: {
    _sort: 'likes',
    _expand: 'comments',
    _page: '9',
    _limit: '10',
  },
};
const args = processFindAllQuery(req.query);
console.log(args);
/*
{
  where: undefined,
  include: { comments: true },
  orderBy: [ { likes: 'asc' } ],
  skip: 80,
  take: 10
}
*/

// above args can be passed in model.findMany function
const posts = await prismaClient.posts.findMany(args);
```

### processFindOneQuery

```typescript
import { processFindOneQuery } from 'prisma-query';
const req = {
  query: { _expand: 'comments', 'comments.user.name': 'justin' },
};

const args = processFindOneQuery(req.query);

// JSON.stringify is used for clean output in the console
console.log(JSON.stringify(args, null, 2));

/*
{
  "include": {
    "comments": {
      "where": {
        "user": {
          "name": "justin"
        }
      }
    }
  }
}
*/

// above args can be passed in model.findUnique function
const post = await prismaClient.post.findUnique(args);
```

### QueryModifier

when passing numeric values in query, distinction can't be made between numeric or string values, we have two ways to solve for this

First ->

in case of number, we can wrap the value in num() function like `?id=num(12)`

in case of boolean, we can wrap the value in bool() function like `?vip=bool(true)`

Second ->

we can define queryModifier for the model and pass it as second argument of processFindAllQuery or processFindOneQuery

NOTE: this will work only for first level, for filters in nested models wrapping with num() and bool() is necessary

```typescript
import { processFindAllQuery, QueryModifier } from 'prisma-query';
/**
 * Model Guest
 *
 */
export type Guest = {
  id: number;
  fans: number;
  name: string;
  vip: boolean;
  eventId: number;
  eventSignupId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

const guestQueryModifier: QueryModifier<Guest> = {
  numericValues: ['id', 'fans', 'eventId', 'eventSignupId'],
  booleanValues: ['vip'],
};

const req = {
  query: {
    eventId: '1',
    fans_gt: '1000', // no need to wrap in num() since property already specified as numeric in guestQueryModifier
    vip: 'true', // no need to wrap in bool()
    'eventSignup.verified': 'bool(true)', // if bool() not specified, then {verified: 'true'}
    _expand: 'events',
    'events.attendees_gt': 'num(1000)', // if num() not specified, then {gt: '1000'}
  },
};
const args = processFindAllQuery(req.query, guestQueryModifier);
console.log(JSON.stringify(args, null, 2));

/*
{
  "where": {
    "eventId": 1,
    "fans": {
      "gt": 1000
    },
    "vip": true,
    "eventSignup": {
      "verified": true
    }
  },
  "include": {
    "events": {
      "where": {
        "attendees": {
          "gt": 1000
        }
      }
    }
  }
}
*/
```

## Examples

```typescript
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
```
