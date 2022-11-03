export const mergeObjects = (target: any, source: any) => {
  const sourceCopyModifiedKeys: any = {};
  if (source) {
    for (const key of Object.keys(source)) {
      if (
        source[key] instanceof Object &&
        !Array.isArray(source[key]) &&
        key in target
      ) {
        sourceCopyModifiedKeys[key] = {
          ...source[key],
          ...mergeObjects(target[key], source[key]),
        };
      }
    }
  }

  return {
    ...target,
    ...source,
    ...sourceCopyModifiedKeys,
  };
};
