import { mergeObjects } from './generalUtils';

const splitByCommaIfString = (str: string | string[]) => {
  if (Array.isArray(str)) return str;
  return str.split(',');
};
const supportCommaSeparatedStringIfPresent = (q: QueryValue) => {
  const array: string[] = [];
  if (Array.isArray(q)) {
    q.forEach((v) => {
      array.push(...splitByCommaIfString(v));
    });
  } else {
    array.push(...splitByCommaIfString(q));
  }
  return array;
};

export const processExpandString = (str: string): any => {
  const dotFirstIndex = str.indexOf('.');
  if (dotFirstIndex === -1) {
    return {
      include: {
        [str]: true,
      },
    };
  }
  const beforeDot = str.slice(0, dotFirstIndex);
  const afterDot = str.slice(dotFirstIndex + 1, str.length);
  return {
    include: {
      [beforeDot]: processExpandString(afterDot),
    },
  };
};

export const processRelationships = (
  _embed?: QueryValue,
  _expand?: QueryValue
) => {
  if (!_embed && !_expand) return;
  const array: string[] = [];
  if (_embed) {
    array.push(...supportCommaSeparatedStringIfPresent(_embed));
  }
  if (_expand) {
    array.push(...supportCommaSeparatedStringIfPresent(_expand));
  }
  let include: Record<string, any> = {};
  for (let v of array) {
    include = mergeObjects(include, processExpandString(v).include);
  }
  return include;
};
const processSorting = (_sort?: string, _order?: string) => {
  if (!_sort) return;
  const sortArray = splitByCommaIfString(_sort);
  const orderArray = (_order ? splitByCommaIfString(_order) : []) as (
    | 'asc'
    | 'desc'
  )[];
  const orderBy: Record<string, 'asc' | 'desc'>[] = [];
  for (let i = 0; i < sortArray.length; i++) {
    if (i < orderArray.length) {
      orderBy.push({
        [sortArray[i]]: orderArray[i],
      });
    } else {
      orderBy.push({
        [sortArray[i]]: 'asc',
      });
    }
  }
  return orderBy;
};

type QueryValue = string | string[];
type Operator = 'gte' | 'lte' | 'gt' | 'lt' | 'ne' | 'like';
const operators: Operator[] = ['gte', 'lte', 'gt', 'lt', 'ne', 'like'];

const processOperators = (
  operator: Operator,
  value: string | number | boolean | null
) => {
  switch (operator) {
    case 'gte': {
      return {
        gte: value,
      };
    }
    case 'lte': {
      return {
        lte: value,
      };
    }
    case 'gt': {
      return {
        gt: value,
      };
    }
    case 'lt': {
      return {
        lt: value,
      };
    }
    case 'ne': {
      return {
        not: value,
      };
    }
    case 'like': {
      if (typeof value === 'number' || typeof value === 'boolean') {
        throw new Error("number/boolean value doesn't supports like operator");
      }
      if (value === null) {
        // passing value as null with like operator treats it as string
        value = 'null';
      }
      if (value.startsWith('^')) {
        return {
          startsWith: value.slice(1),
          mode: 'insensitive',
        };
      } else if (value.endsWith('$')) {
        return {
          endsWith: value.slice(0, value.length - 1),
          mode: 'insensitive',
        };
      } else {
        return {
          contains: value,
          mode: 'insensitive',
        };
      }
    }
  }
};
export const regExpForParsingSpecialValues = {
  bool: /^bool\((true|false)\)$/,
  num: /^num\(\d+\)$/,
};

/**
 *
 * @param value string
 * @returns string
 *
 * @example
 * getValueBetweenBrackets('num(12)')
 * return '12'
 *
 * getValueBetweenBrackets('bool(true)')
 * return 'true'
 */
const getValueBetweenBrackets = (value: string) => {
  return value.slice(value.indexOf('(') + 1, value.length - 1);
};

export const parseValue = ({
  key,
  value,
  queryModifier,
}: {
  key: string;
  value: string;
  queryModifier?: TQueryModifier;
}) => {
  if (value === 'null') {
    return null;
  } else if (queryModifier?.numericValues?.includes(key)) {
    return Number(value);
  } else if (queryModifier?.booleanValues?.includes(key)) {
    if (value === 'true') {
      return true;
    } else if (value === 'false') {
      return false;
    }
  }
  for (const [_type, regExp] of Object.entries(regExpForParsingSpecialValues)) {
    const type = _type as keyof typeof regExpForParsingSpecialValues;
    if (regExp.test(value)) {
      switch (type) {
        case 'bool': {
          const val = getValueBetweenBrackets(value);
          if (val === 'true') return true;
          return false;
        }
        case 'num': {
          const val = getValueBetweenBrackets(value);
          return Number(val);
        }
      }
    }
  }
  return value;
};
export const supportNestedKey = (key: string, nestedKeyValue: any): any => {
  const dotIndex = key.indexOf('.');
  if (dotIndex === -1) {
    return {
      [key]: nestedKeyValue,
    };
  } else {
    const firstKey = key.slice(0, dotIndex);
    return {
      [firstKey]: supportNestedKey(
        key.slice(dotIndex + 1, key.length),
        nestedKeyValue
      ),
    };
  }
};
export const transformDotKeysIntoNestedKeys = (where: Record<string, any>) => {
  let updatedWhere: Record<string, any> = {};
  for (const key in where) {
    updatedWhere = mergeObjects(
      updatedWhere,
      supportNestedKey(key, where[key])
    );
  }
  return updatedWhere;
};

export const processFiltering = (
  filters: Record<string, QueryValue>,
  queryModifier?: TQueryModifier
) => {
  const where: Record<string, any> = {};
  for (let key in filters) {
    const value = filters[key];
    if (Array.isArray(value)) {
      where[key] = {
        in: value.map((v) =>
          parseValue({
            key: key,
            value: v,
            queryModifier,
          })
        ),
      };
    } else {
      const [rawKey, operator] = key.split('_');
      const modifiedValue = parseValue({
        key: rawKey,
        value: value,
        queryModifier: queryModifier,
      });
      if (operators.includes(operator as any)) {
        if (where[rawKey]) {
          where[rawKey] = {
            ...where[rawKey],
            ...processOperators(operator as Operator, modifiedValue),
          };
        } else {
          where[rawKey] = processOperators(operator as Operator, modifiedValue);
        }
      } else {
        where[rawKey] = modifiedValue;
      }
    }
  }
  return transformDotKeysIntoNestedKeys(where);
};
const processPagination = (_page: number, _limit: number) => {
  return {
    take: _limit,
    skip: (_page - 1) * _limit,
  };
};
const processSlicing = (_start: number, _end: number) => {
  return {
    take: _end - _start,
    skip: _start,
  };
};

const getPrefixIndex = (arr: string[], key: string) => {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].startsWith(key + '.')) return i;
  }
  return -1;
};

export const propogateWhereFiltersToNestedModels = ({
  where,
  include,
  query,
}: {
  where: any;
  include: any;
  query: Record<string, QueryValue>;
}) => {
  const queryKeys = Object.keys(query);
  const _expandIndex = queryKeys.indexOf('_expand');
  const _embedIndex = queryKeys.indexOf('_embed');
  for (let key in include) {
    if (key in where) {
      // below logic ensures that filter is not propogated if filter is before _expand/_embed
      const prefixIndex = getPrefixIndex(queryKeys, key);
      if (
        _expandIndex !== -1 &&
        prefixIndex !== -1 &&
        prefixIndex < _expandIndex
      ) {
        continue;
      }
      if (
        _embedIndex !== -1 &&
        prefixIndex !== -1 &&
        prefixIndex < _embedIndex
      ) {
        continue;
      }

      if (include[key] instanceof Object) {
        include[key] = { ...include[key], where: where[key] };
      } else {
        include[key] = {
          where: where[key],
        };
      }
      delete where[key];
    }
  }
};
export type TQueryModifier = {
  numericValues?: string[] | undefined;
  booleanValues?: string[] | undefined;
};
export const processFindAllQuery = (
  query: any,
  queryModifier?: TQueryModifier
) => {
  const {
    _embed,
    _expand,
    _sort,
    _order,
    _page,
    _start,
    _end,
    _limit,
    ...filters
  } = query as Record<string, QueryValue>;
  let skip: number | undefined;
  let take: number | undefined;
  // by default _limit = 10
  const limit = _limit ? Number(_limit) : 10;
  if (_page) {
    const result = processPagination(Number(_page), limit);
    skip = result.skip;
    take = result.take;
  } else if (_start) {
    const start = Number(_start);
    const end = _end ? Number(_end) : start + limit;
    const result = processSlicing(start, end);
    skip = result.skip;
    take = result.take;
  }
  let where: any = processFiltering(filters, queryModifier);
  const include = processRelationships(_embed, _expand);
  propogateWhereFiltersToNestedModels({ where, include, query });
  if (Object.keys(where).length === 0) {
    where = undefined;
  }
  const options = {
    where: where,
    include: include,
    orderBy: processSorting(_sort as string, _order as string),
    skip,
    take,
  };
  return options;
};
export const processFindOneQuery = (query: any) => {
  const { _embed, _expand, ...nestedFilters } = query as Record<
    string,
    QueryValue
  >;
  let where: any = processFiltering(nestedFilters);
  const include = processRelationships(_embed, _expand);
  propogateWhereFiltersToNestedModels({ where, include, query });
  if (Object.keys(where).length === 0) {
    where = undefined;
  }
  const options = {
    include: include,
  };
  return options;
};
