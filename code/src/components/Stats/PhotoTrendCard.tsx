import { font } from '@/src/constants/fonts';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

type Segment = {
  label: string;
  value: number;
  color: string;
  delta?: number;
};

type Props = {
  title?: string;
  subtitle?: string;
  segments: Segment[];
  size?: number;
  thickness?: number;
  gapDeg?: number;
};

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArcFlag = endDeg - startDeg <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function PhotoTrendCard({
  title = '사진 추이',
  subtitle = 'last week',
  segments,
  size = 160,
  thickness = 26,
  gapDeg = 6,
}: Props) {
  const total = segments.reduce((s, v) => s + v.value, 0);
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const gapsTotal = gapDeg * segments.length;
  const usableDeg = 360 - gapsTotal;

  let cursor = 0;

  return (
    <View className="overflow-hidden rounded-2xl">
      <LinearGradient
        colors={['#ffffff', '#f6f7fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: 20, borderRadius: 16 }}>
        {/* 헤더 */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <Text className="text-l" style={[font.bold as any, { color: '#1f2937' }]}>
            {title}
          </Text>
          <Text className="text-sm" style={[font.light as any, { color: '#7b8aa0' }]}>
            {subtitle}
          </Text>
        </View>

        {/* 도넛 */}
        <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: 6 }}>
          <Svg width={size} height={size}>
            <G>
              {/* 배경 고리 */}
              <Circle
                cx={cx}
                cy={cy}
                r={radius}
                stroke="#e8edf2"
                strokeWidth={thickness}
                fill="none"
                strokeLinecap="round"
              />
              {/* 세그먼트 */}
              {segments.map((seg, idx) => {
                const sweep = total === 0 ? 0 : (seg.value / total) * usableDeg;
                const start = -90 + cursor;
                const end = start + sweep;
                const d = describeArc(cx, cy, radius, start, end);
                cursor += sweep + gapDeg;

                return (
                  <Path
                    key={idx}
                    d={d}
                    stroke={seg.color}
                    strokeWidth={thickness}
                    strokeLinecap="round"
                    fill="none"
                  />
                );
              })}
            </G>
          </Svg>

          {/* 중앙 합계 */}
          <View style={{ position: 'absolute' }}>
            <Text className="text-xl font-bold text-black">{total}</Text>
          </View>
        </View>

        {/* 범례 */}
        <View style={{ marginTop: 8, gap: 14 }}>
          {segments.map((s, i) => {
            const hasDelta = typeof s.delta === 'number';
            const isUp = hasDelta && s.delta! > 0;
            const isDown = hasDelta && s.delta! < 0;
            const deltaColor = isUp ? '#22c55e' : isDown ? '#ef4444' : '#6b7280';
            const arrow = isUp ? '▲' : isDown ? '▼' : '–';
            const deltaText = hasDelta ? `${arrow} ${Math.abs(s.delta!)}` : '';

            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }}
                />
                <Text className="text-base font-bold text-[#1f2937]">
                  {s.value} {hasDelta && <Text style={{ color: deltaColor }}>{deltaText}</Text>}
                </Text>
                <Text className="ml-1 text-sm text-[#6b7280]">{s.label}</Text>
              </View>
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
}
