export const encodeURIOptions = (options: Record<string, string>): string => {
  return Object.keys(options)
    .map(
      (key) => encodeURIComponent(key) + "=" + encodeURIComponent(options[key])
    )
    .join("&");
};
