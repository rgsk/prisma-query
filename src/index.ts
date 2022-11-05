export {
  processFindAllQuery,
  processFindOneQuery,
} from 'utils/processQueryUtils';

export type QueryModifier<T> = {
  numericValues?: (keyof T)[] | undefined;
  booleanValues?: (keyof T)[] | undefined;
};
