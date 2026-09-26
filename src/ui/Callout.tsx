import type { ReactNode } from "react";
import { View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { Text } from "../i18n";
import { styles } from "./styles";

export function Callout({ title, body, responsiveStyles }: {
  title: ReactNode;
  body: ReactNode;
  responsiveStyles: {
    calloutBody: StyleProp<TextStyle>;
    calloutBox: StyleProp<ViewStyle>;
    calloutTitle: StyleProp<TextStyle>;
  };
}) {
  return (
    <View style={[styles.calloutBox, responsiveStyles.calloutBox]}>
      <Text style={[styles.calloutTitle, responsiveStyles.calloutTitle]}>{title}</Text>
      <Text style={[styles.calloutBody, responsiveStyles.calloutBody]}>{body}</Text>
    </View>
  );
}
