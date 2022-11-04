# prisma-query

convert query params to prisma args

## Examples

```
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
    '/guests?eventId=1&fans_gt=21000': {
      where: { eventId: 1, fans: { gt: 21000 } },
    },
  };
```
