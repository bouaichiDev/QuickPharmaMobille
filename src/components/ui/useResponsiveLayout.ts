import { useWindowDimensions } from 'react-native';

/** Keep the established portrait-phone design; opt in only under layout pressure. */
export function responsiveLayout({
  width,
  height,
  fontScale,
}: {
  width: number;
  height: number;
  fontScale: number;
}) {
  const narrow = width < 360;
  // A keyboard can reduce portrait window height; keep that phone layout stable.
  const short = width >= 500 && height < 500;
  const largeText = fontScale > 1.2;
  return {
    narrow,
    short,
    largeText,
    landscape: width > height,
    needsReflow: narrow || short || largeText,
  };
}

export function useResponsiveLayout() {
  const dimensions = useWindowDimensions();
  return { ...dimensions, ...responsiveLayout(dimensions) };
}
