import { Text } from "../../i18n";
import type { AppThemeColors } from "../../theme";
import { localTodayDate } from "../../ui/helpers";
import { EditorModal, ModalField } from "../../ui/ui";

type DeadlineEditorModalProps = {
  deadlineDate: string;
  deadlineError: string | null;
  deadlineTitle: string;
  onCancel: () => void;
  onSave: () => void;
  setDeadlineDate: (value: string) => void;
  setDeadlineTitle: (value: string) => void;
  themeColors: AppThemeColors;
  visible: boolean;
};

export function DeadlineEditorModal({
  deadlineDate,
  deadlineError,
  deadlineTitle,
  onCancel,
  onSave,
  setDeadlineDate,
  setDeadlineTitle,
  themeColors,
  visible,
}: DeadlineEditorModalProps) {
  return (
    <EditorModal
      onCancel={onCancel}
      onSave={onSave}
      saveLabel="Create deadline"
      title="Create deadline"
      visible={visible}
    >
      <ModalField
        label="Title"
        onChangeText={setDeadlineTitle}
        placeholder="Deadline title"
        value={deadlineTitle}
      />
      <ModalField
        label="Day (YYYY-MM-DD)"
        onChangeText={setDeadlineDate}
        placeholder={localTodayDate()}
        value={deadlineDate}
      />
      {deadlineError ? (
        <Text style={{ color: themeColors.orangeInk }}>{deadlineError}</Text>
      ) : null}
    </EditorModal>
  );
}
