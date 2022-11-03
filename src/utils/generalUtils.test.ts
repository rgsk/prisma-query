import { mergeObjects } from './generalUtils';

describe('mergeObjects works', () => {
  test('mergeObjects basic', () => {
    const target = {
      person: {
        name: 'name1',
      },
    };
    const source = {
      person: {
        age: 22,
      },
    };
    const res1 = mergeObjects(target, source);
    // merge should happen correctly
    expect(res1).toEqual({
      person: {
        name: 'name1',
        age: 22,
      },
    });
    // objects should remain unmodified
    expect(target).toEqual({
      person: {
        name: 'name1',
      },
    });
    expect(source).toEqual({
      person: {
        age: 22,
      },
    });
  });
  test('mergeObjects override', () => {
    const res2 = mergeObjects(
      {
        person: {
          name: 'name1',
        },
      },
      {
        person: {
          name: 'name2',
          age: 22,
        },
      }
    );
    expect(res2).toEqual({
      person: {
        name: 'name2',
        age: 22,
      },
    });
  });
  test('target undefined', () => {
    expect(mergeObjects(undefined, { message: 'hii' })).toEqual({
      message: 'hii',
    });
  });
  test('source undefined', () => {
    expect(mergeObjects({ message: 'hii' }, undefined)).toEqual({
      message: 'hii',
    });
  });
  test('nested merge', () => {
    const target = {
      person: {
        name: 'name1',
        address: {
          house: 703,
          sector: 22,
          city: 'Chandigarh',
        },
        employment: {
          details: {
            id: 1,
            properties: {
              place: 'Bangalore',
            },
          },
        },
      },
    };
    const source = {
      person: {
        employment: {
          details: {
            id: 2,
            properties: {
              pinCode: 1211,
            },
          },
        },
      },
    };
    const result = {
      person: {
        name: 'name1',
        address: {
          house: 703,
          sector: 22,
          city: 'Chandigarh',
        },
        employment: {
          details: {
            id: 2,
            properties: {
              place: 'Bangalore',
              pinCode: 1211,
            },
          },
        },
      },
    };
    expect(mergeObjects(target, source)).toEqual(result);
  });
});
