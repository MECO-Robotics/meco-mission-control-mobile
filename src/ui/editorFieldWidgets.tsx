import { useContext } from "react";
import { EditorPendingContext } from "./editorWidgets";
import { Pressable, TextInput, type KeyboardTypeOptions, View } from "react-native";

import { Text, useTranslation } from "../i18n";
import { styles } from "./styles";
import { useAppTheme } from "./themeContext";

export function ModalField({
  label,
  value,
  placeholder,
  onChangeText,
  multiline = false,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
}) {
  const pending = useContext(EditorPendingContext);
  const { colors: themeColors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.modalField}>
      <Text style={[styles.modalFieldLabel, { color: themeColors.subtleText }]}>{label}</Text>
      <TextInput
        accessibilityLabel={t(label)}
        editable={!pending}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder ? t(placeholder) : undefined}
        placeholderTextColor={themeColors.subtleText}
        style={[
          styles.modalFieldInput,
          {
            backgroundColor: themeColors.canvas,
            borderColor: themeColors.border,
            color: themeColors.ink,
          },
          multiline && styles.modalFieldInputMultiline,
        ]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
      />
    </View>
  );
}

export function ToggleField({
  label,
  value,
  onToggle,
  role = "switch",
}: {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  role?: "switch" | "checkbox";
}) {
  const pending = useContext(EditorPendingContext);
  const { colors: themeColors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={t(label)}
      accessibilityState={{ checked: value, disabled: pending }}
      disabled={pending}
      onPress={() => onToggle(!value)}
      style={[
        styles.toggleField,
        { backgroundColor: themeColors.canvas, borderColor: themeColors.border },
        value && [styles.toggleFieldActive, { backgroundColor: themeColors.navySurface }],
      ]}
    >
      <Text style={[styles.toggleFieldLabel, { color: themeColors.ink }]}>{label}</Text>
      <Text
        style={[
          styles.toggleFieldValue,
          { color: themeColors.subtleText },
          value && [styles.toggleFieldValueActive, { color: themeColors.navyInk }],
        ]}
      >
        {value ? "Yes" : "No"}
      </Text>
    </Pressable>
  );
}

export function ParticipantField({ options, value, onChange }: {
  options: { id: string; name: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = value.split(",").map((id) => id.trim()).filter(Boolean);
  return <View style={styles.modalField}>
    <Text style={styles.modalFieldLabel}>Participants</Text>
    {options.map((option) => <ToggleField key={option.id} role="checkbox" label={option.name}
      value={selected.includes(option.id)} onToggle={(checked) => onChange(
        (checked ? [...selected, option.id] : selected.filter((id) => id !== option.id)).join(","),
      )} />)}
  </View>;
}
