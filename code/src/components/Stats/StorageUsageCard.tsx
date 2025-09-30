import { font } from '@/src/constants/fonts';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import Svg, { Defs, Path, Stop, LinearGradient as SvgLinear } from 'react-native-svg';

type Props = { usedGB: number; totalGB: number; title?: string };

const WIDTH = 170; // 게이지 가로 길이
const STROKE = 25; // 두께
const R = (WIDTH - STROKE) / 2; // 반지름
const CX = WIDTH / 2;
const CY = R + STROKE / 2; // 위쪽 반원이 딱 들어오도록 Y 중심
const ARC_LEN = Math.PI * R; // 반원 둘레

// 위쪽 반원 하나만 그리는 path (왼쪽 → 오른쪽)
const SEMI_D = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

function getMood(pct: number) {
  if (pct <= 0.25) return { emoji: '😄', badgeBg: '#E7F8EC', gradFill: ['#34C759', '#7BE383'] }; // 여유
  if (pct <= 0.5) return { emoji: '🙂', badgeBg: '#E9EEFC', gradFill: ['#35A2FF', '#65D3FF'] }; // 보통
  if (pct <= 0.75) return { emoji: '😐', badgeBg: '#FFF4D6', gradFill: ['#FDBA74', '#FCD34D'] }; // 주의
  if (pct <= 0.9) return { emoji: '😬', badgeBg: '#FFE9E3', gradFill: ['#FF8A65', '#FF7043'] }; // 부족
  return { emoji: '😱', badgeBg: '#FFE5E5', gradFill: ['#FF4D4F', '#FF7875'] }; // 임박
}
export default function StorageUsageCard({ usedGB, totalGB, title = '사진 점유율' }: Props) {
  const pct = totalGB > 0 ? Math.min(1, Math.max(0, usedGB / totalGB)) : 0;
  const { emoji, badgeBg, gradFill } = getMood(pct);

  return (
    <View className="overflow-hidden rounded-2xl">
      <LinearGradient
        colors={['#ffffff', '#f6f7fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: 16,
          borderRadius: 16,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        }}>
        <View className="flex-row items-center justify-between">
          {/* 좌측 정보 */}
          <View className="flex-row items-center gap-3">
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                backgroundColor: badgeBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text className="text-lg">{emoji}</Text>
            </View>
            <View>
              <Text style={font.bold} className="text-base">
                {title}
              </Text>
              <Text style={font.bold} className="mt-1 text-base">
                {usedGB.toFixed(1)} GB
              </Text>
              <View
                style={{ height: 1, backgroundColor: '#e6e9f0', marginVertical: 8, width: 90 }}
              />
              <Text style={font.light} className="text-sm text-[#7b8aa0]">
                of {totalGB} GB
              </Text>
            </View>
          </View>

          {/* 우측 반원 게이지 */}
          <View
            style={{
              width: WIDTH,
              height: R + STROKE,
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}>
            <Svg width={WIDTH} height={R + STROKE}>
              <Defs>
                {/* 사용량 색상: 점유율에 따라 동적으로 변경 */}
                <SvgLinear id="gradFill" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor={gradFill[0]} />
                  <Stop offset="100%" stopColor={gradFill[1]} />
                </SvgLinear>
                {/* 배경 색상(고정, 연한 주황톤) */}
                <SvgLinear id="gradBg" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0%" stopColor="#fde8d9" />
                  <Stop offset="100%" stopColor="#f9e6d9" />
                </SvgLinear>
              </Defs>

              {/* 배경 반원 */}
              <Path
                d={SEMI_D}
                stroke="url(#gradBg)"
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
              />

              {/* 진행 반원: dash로 비율 제어 */}
              <Path
                d={SEMI_D}
                stroke="url(#gradFill)"
                strokeWidth={STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={ARC_LEN}
                strokeDashoffset={(1 - pct) * ARC_LEN}
              />
            </Svg>

            {/* 중앙 퍼센트 */}
            <View style={{ position: 'absolute', bottom: STROKE / 2 + 2, alignItems: 'center' }}>
              <Text style={font.bold} className="text-base text-black">
                {Math.round(pct * 100)}%
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
