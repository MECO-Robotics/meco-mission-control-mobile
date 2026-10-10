import { Callout } from "../../ui/Callout";
import { useEffect, useState } from "react";
import { View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { Text } from "../../i18n";
import { getHelpRequestValidationError } from "../../data/helpRequests";
import { styles } from "../../ui/styles";
import { DropdownField, EditorModal, ModalField, StatusPill } from "../../ui/ui";
import type { Option } from "../../ui/types";

export type NeedHelpSubmitInput = {
  reason: string;
  mentorId: string;
};

export function NeedHelpModal({
  appResponsiveStyles,
  contextTitle,
  defaultMentorId,
  mentorOptions,
  onCancel,
  onSubmit,
  visible,
}: {
  appResponsiveStyles: {
    calloutBody: StyleProp<TextStyle>;
    calloutBox: StyleProp<ViewStyle>;
    calloutTitle: StyleProp<TextStyle>;
    rowSubtitle: StyleProp<TextStyle>;
  };
  contextTitle: string;
  defaultMentorId: string;
  mentorOptions: Option[];
  onCancel: () => void;
  onSubmit: (input: NeedHelpSubmitInput) => boolean;
  visible: boolean;
}) {
  const [reason, setReason] = useState("");
  const [mentorId, setMentorId] = useState(defaultMentorId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setReason("");
    setMentorId(defaultMentorId);
    setError(null);
  }, [defaultMentorId, visible]);

  const submit = () => {
    const input = { reason, mentorId };
    const validationError = getHelpRequestValidationError({
      ...input,
      requestedById: null,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    if (onSubmit(input)) {
      setReason("");
      setError(null);
    }
  };

  return (
    <EditorModal
      onCancel={onCancel}
      onSave={submit}
      saveLabel="Request help"
      title="Need help"
      visible={visible}
    >
      <View style={styles.queueRowHeader}>
        <View style={styles.queueRowPrimaryText}>
          <Text style={[styles.queueRowSubtitle, appResponsiveStyles.rowSubtitle]}>
            {contextTitle}
          </Text>
        </View>
        <StatusPill label="Requested" value="requested" />
      </View>
      {error ? (
        <Callout
          responsiveStyles={appResponsiveStyles}
          title="Check help request"
          body={error}
        />
      ) : null}
      <ModalField
        label="Reason"
        multiline
        onChangeText={(value) => {
          setError(null);
          setReason(value);
        }}
        placeholder="What are you stuck on or what should a mentor look at?"
        value={reason}
      />
      <DropdownField
        label="Mentor"
        onChange={(value) => {
          setError(null);
          setMentorId(value);
        }}
        options={mentorOptions}
        placeholder="Select mentor"
        value={mentorId}
      />
    </EditorModal>
  );
}
