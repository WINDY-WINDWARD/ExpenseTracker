import React from 'react';
import { View, Text } from 'react-native';
import { Svg, G, Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';

// Simple responsive line chart using react-native-svg
// Props:
// - months: array of month labels (strings)
// - series: [{ label, color, values: [number] }]
// - height: number (px)
// - width: number (optional)
export default function LineChart({ months = [], series = [], height = 200, width = 320 }) {
  const padding = 28;
  const innerWidth = Math.max(40, width - padding * 2);
  const innerHeight = Math.max(40, height - padding * 2);

  // Format numbers as "Rs 1,234.56"
  const formatRs = (v) => {
    const n = Number(v) || 0;
    // fixed 2 decimals and thousands separator
    const parts = n.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `Rs ${parts.join('.')}`;
  };

  // compute max value across all series
  const allValues = series.flatMap(s => s.values.map(v => Number(v) || 0));
  const maxValue = allValues.length ? Math.max(...allValues) : 0;
  const yMax = maxValue === 0 ? 1 : maxValue;

  // map x positions
  const count = Math.max(1, months.length);
  const xStep = innerWidth / Math.max(1, count - 1);

  const valueToY = (v) => {
    const ratio = v / yMax;
    return padding + innerHeight - ratio * innerHeight;
  };

  const xForIndex = (i) => padding + i * xStep;

  return (
    <View style={{ alignItems: 'center', marginVertical: 8 }}>
      <Svg width={width} height={height}>
        <G>
          {/* horizontal grid lines (draw first) */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const y = padding + innerHeight - t * innerHeight;
            return (
              <Line key={`grid-${i}`} x1={padding} y1={y} x2={padding + innerWidth} y2={y} stroke="#e6e6e6" strokeWidth={1} />
            );
          })}

          {/* x axis labels */}
          {months.map((m, i) => (
            <SvgText key={`xl-${i}`} x={xForIndex(i)} y={padding + innerHeight + 16} fontSize={11} fill="#000000ff" textAnchor="middle">
              {m}
            </SvgText>
          ))}

          {/* series lines */}
          {series.map((s, si) => {
            const points = s.values.map((v, i) => `${xForIndex(i)},${valueToY(Number(v) || 0)}`).join(' ');
            return (
              <G key={`s-${si}`}>
                <Polyline points={points} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                {/* dots */}
                {s.values.map((v, i) => (
                  <Circle key={`dot-${si}-${i}`} cx={xForIndex(i)} cy={valueToY(Number(v) || 0)} r={3.2} fill={s.color} />
                ))}
              </G>
            );
          })}

          {/* y-axis labels rendered last so they appear on top of series */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
            const y = padding + innerHeight - t * innerHeight;
            const labelValue = yMax * t;
            const label = formatRs(labelValue);
            return (
              <SvgText key={`yl-${i}`} x={6} y={y + 4} fontSize={10} fill="#000000ff" textAnchor="start">{label}</SvgText>
            );
          })}
        </G>
      </Svg>

      {/* legend */}
      <View style={{ flexDirection: 'row', marginTop: 8, flexWrap: 'wrap', width: innerWidth, justifyContent: 'center' }}>
        {series.map((s, i) => {
          const lastVal = Array.isArray(s.values) && s.values.length ? s.values[s.values.length - 1] : null;
          return (
            <View key={`legend-${i}`} style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, marginBottom: 6 }}>
              <View style={{ width: 12, height: 12, backgroundColor: s.color, marginRight: 6, borderRadius: 3 }} />
              <Text style={{ fontSize: 12, color: '#000000ff' }}>
                {s.label}{lastVal !== null ? `: ${formatRs(lastVal)}` : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
