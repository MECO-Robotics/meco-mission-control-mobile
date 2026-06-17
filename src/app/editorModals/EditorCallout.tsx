import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { View } from "react-native";

import { Text } from "../../i18n";
import { styles } from "../../ui/styles";

type EditorCalloutProps = {
  body: string;
  bodyStyle: StyleProp<TextStyle>;
  boxStyle: StyleProp<ViewStyle>;
  title: string;
  titleStyle: StyleProp<TextStyle>;
};

export function EditorCallout({
  body,
  bodyStyle,
  boxStyle,
  title,
  titleStyle,
}: EditorCalloutProps) {
  return (
    <View style={[styles.calloutBox, boxStyle]}>
      <Text style={[styles.calloutTitle, titleStyle]}>{title}</Text>
      <Text style={[styles.calloutBody, bodyStyle]}>{body}</Text>
    </View>
  );
}
