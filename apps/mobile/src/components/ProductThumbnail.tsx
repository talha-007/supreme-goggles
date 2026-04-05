import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { View } from "react-native";

type Props = {
  imageUrl: string | null | undefined;
  /** Square size in dp (default 52). */
  size?: number;
};

/** Rounded catalog thumbnail or neutral placeholder when missing / failed to load. */
export function ProductThumbnail({ imageUrl, size = 52 }: Props) {
  const [failed, setFailed] = useState(false);
  const uri = imageUrl?.trim();

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const corner = Math.round(size * 0.15);
  if (!uri || failed) {
    return (
      <View
        className="items-center justify-center bg-neutral-800"
        style={{ width: size, height: size, borderRadius: corner }}
      >
        <Ionicons name="cube-outline" size={Math.round(size * 0.42)} color="#737373" />
      </View>
    );
  }

  return (
    <Image
      key={uri}
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: corner, backgroundColor: "#262626" }}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
      onError={() => setFailed(true)}
    />
  );
}
