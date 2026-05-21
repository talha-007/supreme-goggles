import { Image, type ImageStyle, type StyleProp } from "react-native";

type Props = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

/** In-app Taplite mark (synced from web `taplite_obic` via `ensure-assets` + `assets/brand-mark.png`). */
export function BrandMark({ size = 56, style }: Props) {
  return (
    <Image
      source={require("../../assets/brand-mark.png")}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="Taplite"
    />
  );
}
