import { View } from "react-native";

import { statusToneColors } from "../../theme";
import { Text } from "../../i18n";
import { styles } from "../../ui/styles";

type AttendanceStatusMarkProps = {
  status: "yes" | "maybe" | "no";
};

export function AttendanceStatusMark({ status }: AttendanceStatusMarkProps) {
  const color =
    status === "yes"
      ? statusToneColors.success.mark
      : status === "maybe"
        ? statusToneColors.warning.ink
        : statusToneColors.danger.ink;
  const label = status === "yes" ? "✓" : status === "maybe" ? "?" : "×";

  return (
    <View style={[styles.attendanceMark, { borderColor: color }]}>
      <Text style={[styles.attendanceMarkLabel, { color }]}>{label}</Text>
    </View>
  );
}
