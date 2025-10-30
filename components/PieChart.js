import React from 'react';
import { View, Text } from 'react-native';
import { Svg, G, Path, Text as SvgText } from 'react-native-svg';

function calculatePie(data) {
  // Sanitize values to ensure all are numbers
  const sanitizedData = data.map(item => ({
    ...item,
    value: Number(parseFloat(item.value)) || 0
  }));
  const total = sanitizedData.reduce((sum, item) => sum + item.value, 0);
  let startAngle = 0;
  const radius = 100;
  const centerX = 125;
  const centerY = 125;
  return sanitizedData.map((item) => {
    const angle = total === 0 ? 0 : (item.value / total) * 360;
    const endAngle = startAngle + angle;
    const largeArcFlag = angle > 180 ? 1 : 0;
    const startRadians = (Math.PI / 180) * startAngle;
    const endRadians = (Math.PI / 180) * endAngle;
    const x1 = centerX + radius * Math.cos(startRadians);
    const y1 = centerY + radius * Math.sin(startRadians);
    const x2 = centerX + radius * Math.cos(endRadians);
    const y2 = centerY + radius * Math.sin(endRadians);
    const path = angle === 0 ? '' : `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;
    startAngle += angle;
    return { ...item, path };
  });
}
// currency formatter used for legends
function formatRs(v) {
  const n = Number(v) || 0;
  const parts = n.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `Rs ${parts.join('.')}`;
}

export default function PieChart({ data, height = 250 }) {
  const pieData = calculatePie(data);
  const validCount = Array.isArray(data) ? data.filter(item => Number(item.value) > 0).length : 0;
  const hasData = validCount >= 2;
  return (
    <View style={{ alignItems: 'center', marginVertical: 16 }}>
      {hasData ? (
        <>
          <Svg width={height} height={height}>
            <G>
              {pieData.map((slice, i) => (
                slice.path ? <Path key={i} d={slice.path} fill={slice.color} /> : null
              ))}
            </G>
          </Svg>
          {/* Legend below chart */}
          <View style={{ marginTop: 12, alignItems: 'center', width: height }}>
            {pieData.map((slice, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                <View style={{ width: 14, height: 14, backgroundColor: slice.color, borderRadius: 7, marginRight: 8 }} />
                <Text style={{ fontSize: 14, color: '#636e72' }}>{slice.label}: {formatRs(slice.value)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={{ height, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#636e72', textAlign: 'center' }}>
            Please add data to view the chart.
          </Text>
        </View>
      )}
    </View>
  );
}
