import React from 'react';
import { View } from 'react-native';
import { Svg, G, Path, Text as SvgText } from 'react-native-svg';

function calculatePie(data) {
  // Sanitize values to ensure all are numbers
  const sanitizedData = data.map(item => ({
    ...item,
    value: Number(parseFloat(item.value)) || 0
  }));
  const total = sanitizedData.reduce((sum, item) => sum + item.value, 0);
  let startAngle = 0;
  return sanitizedData.map((item) => {
    const angle = total === 0 ? 0 : (item.value / total) * 360;
    const endAngle = startAngle + angle;
    const largeArcFlag = angle > 180 ? 1 : 0;
    const radius = 100;
    const centerX = 125;
    const centerY = 125;
    const startRadians = (Math.PI / 180) * startAngle;
    const endRadians = (Math.PI / 180) * endAngle;
    const x1 = centerX + radius * Math.cos(startRadians);
    const y1 = centerY + radius * Math.sin(startRadians);
    const x2 = centerX + radius * Math.cos(endRadians);
    const y2 = centerY + radius * Math.sin(endRadians);
    const path = `M${centerX},${centerY} L${x1},${y1} A${radius},${radius} 0 ${largeArcFlag},1 ${x2},${y2} Z`;
    startAngle += angle;
    return { ...item, path };
  });
}

export default function PieChart({ data, height = 250 }) {
  const pieData = calculatePie(data);
  return (
    <View style={{ alignItems: 'center', marginVertical: 16 }}>
      <Svg width={height} height={height}>
        <G>
          {pieData.map((slice, i) => (
            <Path key={i} d={slice.path} fill={slice.color} />
          ))}
          {pieData.map((slice, i) => (
            <SvgText
              key={i}
              x={125}
              y={30 + i * 20}
              fontSize={14}
              fill={slice.color}
              textAnchor="middle"
            >
              {slice.label}: {(Number(slice.value) || 0).toFixed(2)}
            </SvgText>
          ))}
        </G>
      </Svg>
    </View>
  );
}
