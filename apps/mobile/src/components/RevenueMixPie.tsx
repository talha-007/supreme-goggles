import { View } from "react-native";
import Svg, { G, Path } from "react-native-svg";

/** Aligned with web `sales-analytics-charts` palette. */
export const REVENUE_MIX_SLICE_COLORS = [
  "#0d9488",
  "#10b981",
  "#14b8a6",
  "#2dd4bf",
  "#047857",
  "#0f766e",
  "#115e59",
  "#134e4a",
  "#64748b",
] as const;

type SliceInput = { key: string; revenue: number; color: string };

function describeDonutSegment(
  cx: number,
  cy: number,
  rIn: number,
  rOut: number,
  a0: number,
  a1: number,
): string {
  const x0o = cx + rOut * Math.cos(a0);
  const y0o = cy + rOut * Math.sin(a0);
  const x1o = cx + rOut * Math.cos(a1);
  const y1o = cy + rOut * Math.sin(a1);
  const x0i = cx + rIn * Math.cos(a0);
  const y0i = cy + rIn * Math.sin(a0);
  const x1i = cx + rIn * Math.cos(a1);
  const y1i = cy + rIn * Math.sin(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${x0o} ${y0o}`,
    `A ${rOut} ${rOut} 0 ${large} 1 ${x1o} ${y1o}`,
    `L ${x1i} ${y1i}`,
    `A ${rIn} ${rIn} 0 ${large} 0 ${x0i} ${y0i}`,
    "Z",
  ].join(" ");
}

type Props = {
  size: number;
  totalRevenue: number;
  slices: SliceInput[];
};

/**
 * Donut chart: each slice is `revenue / totalRevenue` of the same total (line-item mix).
 * Full single-slice 100% is drawn as two semicircles (SVG has no true 360° arc in one go).
 */
export function RevenueMixPie({ size, totalRevenue, slices }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const rOut = size * 0.42;
  const rIn = size * 0.24;
  if (totalRevenue <= 0 || slices.length === 0) {
    return <View className="items-center justify-center" style={{ width: size, height: size }} />;
  }

  const paths: { d: string; color: string; k: string }[] = [];
  if (slices.length === 1) {
    const a0 = -Math.PI / 2;
    const c = slices[0]!.color;
    const k = slices[0]!.key;
    paths.push({ d: describeDonutSegment(cx, cy, rIn, rOut, a0, a0 + Math.PI), color: c, k: `${k}-a` });
    paths.push({
      d: describeDonutSegment(cx, cy, rIn, rOut, a0 + Math.PI, a0 + 2 * Math.PI - 0.0001),
      color: c,
      k: `${k}-b`,
    });
  } else {
    let a = -Math.PI / 2;
    for (const s of slices) {
      const t = s.revenue / totalRevenue;
      if (t <= 0) continue;
      const a1 = a + t * 2 * Math.PI;
      paths.push({ d: describeDonutSegment(cx, cy, rIn, rOut, a, a1 - 1e-9), color: s.color, k: s.key });
      a = a1;
    }
  }

  if (paths.length === 0) {
    return <View className="items-center justify-center" style={{ width: size, height: size }} />;
  }

  return (
    <View className="items-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} accessibilityLabel="Revenue mix chart">
        <G>
          {paths.map((p) => (
            <Path key={p.k} d={p.d} fill={p.color} stroke="none" />
          ))}
        </G>
      </Svg>
    </View>
  );
}
