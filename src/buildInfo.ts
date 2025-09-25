declare const __BUILD_TIME__: string;
declare const __BUILD_COMMIT__: string;

const fallbackLabel = "dev";

export const buildInfo = {
  time: typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : fallbackLabel,
  commit:
    typeof __BUILD_COMMIT__ !== "undefined" && __BUILD_COMMIT__
      ? __BUILD_COMMIT__
      : fallbackLabel,
};

export const buildLabel = `${buildInfo.time} (${buildInfo.commit})`;
