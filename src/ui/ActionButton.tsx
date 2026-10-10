import { Pressable, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { Text } from "../i18n";
import { styles } from "./styles";

type ActionStyles = {
  primaryAction?: StyleProp<ViewStyle>;
  primaryActionLabel?: StyleProp<TextStyle>;
  quickActionButton?: StyleProp<ViewStyle>;
  quickActionButtonLabel?: StyleProp<TextStyle>;
};

// Screens own eligibility and commands; this component owns the shared visual treatment.
export function ActionButton({
  children,
  variant,
  responsiveStyles,
  ...props
}: Omit<PressableProps, "style" | "children"> & {
  children: React.ReactNode;
  variant: "primary" | "quick";
  responsiveStyles: ActionStyles;
}) {
  const buttonStyle = variant === "primary" ? "primaryAction" : "quickActionButton";
  const labelStyle = variant === "primary" ? "primaryActionLabel" : "quickActionButtonLabel";
  return (
    <Pressable {...props} style={[styles[buttonStyle], responsiveStyles[buttonStyle]]}>
      <Text style={[styles[labelStyle], responsiveStyles[labelStyle]]}>{children}</Text>
    </Pressable>
  );
}
