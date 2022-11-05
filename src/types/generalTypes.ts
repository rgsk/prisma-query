export type QueryModifier<T> = {
  numericValues?: (keyof T)[] | undefined;
  booleanValues?: (keyof T)[] | undefined;
};
