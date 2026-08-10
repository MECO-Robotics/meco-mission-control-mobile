import { StatusBar } from "expo-status-bar";
import type { Dispatch, SetStateAction } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  TextInput,
  View,
} from "react-native";

import { Text } from "../../i18n";
import type { MobileAuthErrorState } from "../../data/api";
import type { PublicAuthConfig } from "../../types/domain";
import { colors, loginColors } from "../../theme";
import { loginScreenStyles as styles } from "./loginScreenStyles";

type LoginScreenProps = {
  authCode: string;
  authConfig: PublicAuthConfig | null;
  authEmail: string;
  authError: string | null;
  authNotice: string | null;
  hasRequestedEmailCode: boolean;
  height: number;
  isAuthenticating: boolean;
  isDarkModeEnabled: boolean;
  isDevBypassAvailable: boolean;
  canRetrySavedSession: boolean;
  retrySavedSession: () => void;
  setAuthCode: Dispatch<SetStateAction<string>>;
  setAuthEmail: Dispatch<SetStateAction<string>>;
  setAuthError: Dispatch<SetStateAction<string | null>>;
  setAuthErrorState: Dispatch<SetStateAction<MobileAuthErrorState | null>>;
  setAuthNotice: Dispatch<SetStateAction<string | null>>;
  setHasRequestedEmailCode: Dispatch<SetStateAction<boolean>>;
  signInWithDevBypass: () => void;
  signInWithEmail: () => void;
  width: number;
};

export function LoginScreen({
  authCode,
  authConfig,
  authEmail,
  authError,
  authNotice,
  hasRequestedEmailCode,
  height,
  isAuthenticating,
  isDarkModeEnabled,
  isDevBypassAvailable,
  canRetrySavedSession,
  retrySavedSession,
  setAuthCode,
  setAuthEmail,
  setAuthError,
  setAuthErrorState,
  setAuthNotice,
  setHasRequestedEmailCode,
  signInWithDevBypass,
  signInWithEmail,
  width,
}: LoginScreenProps) {
  const hostedDomain = authConfig?.hostedDomain ?? "mecorobotics.org";
  const isEmailCodeFlowAvailable = authConfig?.emailEnabled !== false;
  const loginScale = Math.min(
    1.45,
    Math.max(0.78, Math.min(width / 390, height / 722)),
  );
  const scaleLogin = (value: number) => Math.round(value * loginScale);
  const loginCardHeight = Math.min(height - 8, scaleLogin(722));
  const loginCardWidth = Math.min(width - 48, scaleLogin(334));

  return (
    <View
      style={[
        styles.screen,
        isDarkModeEnabled ? styles.screenDark : styles.screenLight,
      ]}
    >
      <StatusBar
        style={isDarkModeEnabled ? "light" : "dark"}
      />
      <SafeAreaView
        style={[
          styles.safeArea,
          isDarkModeEnabled ? styles.screenDark : styles.screenLight,
        ]}
      >
        <View
          style={[
            styles.card,
            isDarkModeEnabled ? styles.cardDark : styles.cardLight,
            {
              borderRadius: scaleLogin(29),
              minHeight: loginCardHeight,
              paddingBottom: scaleLogin(28),
              paddingHorizontal: scaleLogin(28),
              paddingTop: scaleLogin(28),
              width: loginCardWidth,
            },
          ]}
        >
          <View style={styles.badgeShadow}>
            <Image
              accessibilityLabel="Team MECO 8324 logo"
              resizeMode="contain"
              source={require("../../../assets/meco-shield.png")}
              style={[
                styles.logoImage,
                { height: scaleLogin(334), width: scaleLogin(304) },
              ]}
            />
          </View>

          {isEmailCodeFlowAvailable ? (
            <>
              <Text
                style={[
                  styles.title,
                  {
                    color: isDarkModeEnabled ? colors.white : colors.blue,
                    fontSize: scaleLogin(28),
                    marginBottom: scaleLogin(16),
                    marginTop: scaleLogin(14),
                  },
                ]}
              >
                Sign in with email
              </Text>

              <View
                style={[
                  styles.emailRow,
                  isDarkModeEnabled ? styles.emailRowDark : styles.emailRowLight,
                  {
                    minHeight: scaleLogin(50),
                    paddingLeft: scaleLogin(18),
                    paddingRight: scaleLogin(8),
                  },
                ]}
              >
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  editable={!isAuthenticating && !hasRequestedEmailCode}
                  keyboardType="email-address"
                  onChangeText={(value) => {
                    setAuthEmail(value);
                    setAuthCode("");
                    setAuthNotice(null);
                    setHasRequestedEmailCode(false);
                  }}
                  placeholder={`you@${hostedDomain}`}
                  placeholderTextColor={loginColors.placeholder}
                  returnKeyType="next"
                  style={[
                    styles.emailInput,
                    { fontSize: scaleLogin(13), paddingVertical: scaleLogin(12) },
                  ]}
                  textContentType="emailAddress"
                  value={authEmail}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={isAuthenticating}
                  onPress={() => {
                    if (hasRequestedEmailCode) {
                      setAuthCode("");
                      setAuthError(null);
                      setAuthErrorState(null);
                      setAuthNotice(null);
                      setHasRequestedEmailCode(false);
                      return;
                    }

                    void signInWithEmail();
                  }}
                  style={[
                    styles.sendButton,
                    styles.inlineSendButton,
                    {
                      minHeight: scaleLogin(36),
                      minWidth: scaleLogin(78),
                      paddingHorizontal: scaleLogin(10),
                    },
                  ]}
                >
                  <Text style={[styles.sendButtonText, { fontSize: scaleLogin(12) }]}>
                    {hasRequestedEmailCode ? "Change" : isAuthenticating ? "Sending" : "Send Code"}
                  </Text>
                </Pressable>
              </View>

              {hasRequestedEmailCode ? (
                <View
                  style={[
                    styles.codeRow,
                    isDarkModeEnabled ? styles.emailRowDark : styles.emailRowLight,
                    {
                      marginTop: scaleLogin(10),
                      minHeight: scaleLogin(50),
                      paddingLeft: scaleLogin(18),
                      paddingRight: scaleLogin(8),
                    },
                  ]}
                >
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="one-time-code"
                    autoCorrect={false}
                    editable={!isAuthenticating}
                    keyboardType="default"
                    onChangeText={setAuthCode}
                    onSubmitEditing={signInWithEmail}
                    placeholder="Code"
                    placeholderTextColor={loginColors.placeholder}
                    returnKeyType="go"
                    style={[
                      styles.emailInput,
                      { fontSize: scaleLogin(13), paddingVertical: scaleLogin(12) },
                    ]}
                    textContentType="oneTimeCode"
                    value={authCode}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={isAuthenticating}
                    onPress={signInWithEmail}
                    style={[
                      styles.sendButton,
                      styles.inlineSendButton,
                      {
                        minHeight: scaleLogin(36),
                        minWidth: scaleLogin(78),
                        paddingHorizontal: scaleLogin(10),
                      },
                    ]}
                  >
                    <Text style={[styles.sendButtonText, { fontSize: scaleLogin(12) }]}>
                      {isAuthenticating ? "Checking" : "Verify"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ) : null}

          {authNotice ? (
            <Text style={[styles.noticeText, { fontSize: scaleLogin(14) }]}>
              {authNotice}
            </Text>
          ) : null}
          {authError ? (
            <Text
              style={[
                styles.errorText,
                {
                  color: isDarkModeEnabled ? loginColors.darkError : colors.orangeInk,
                  fontSize: scaleLogin(14),
                },
              ]}
            >
              {authError}
            </Text>
          ) : null}

          {canRetrySavedSession ? (
            <Pressable
              accessibilityRole="button"
              disabled={isAuthenticating}
              onPress={retrySavedSession}
              style={styles.sendButton}
            >
              <Text style={styles.sendButtonText}>
                {isAuthenticating ? "Retrying" : "Retry workspace load"}
              </Text>
            </Pressable>
          ) : null}

          {isDevBypassAvailable ? (
            <Pressable
              accessibilityRole="button"
              disabled={isAuthenticating}
              onPress={signInWithDevBypass}
              style={({ pressed }) => [
                styles.devModeButton,
                {
                  gap: scaleLogin(8),
                  marginTop: "auto",
                  minHeight: scaleLogin(42),
                  paddingHorizontal: scaleLogin(14),
                },
                pressed && styles.devModeButtonPressed,
              ]}
            >
              <View
                style={[
                  styles.devModeAvatar,
                  { height: scaleLogin(22), width: scaleLogin(22) },
                ]}
              >
                <Text style={[styles.devModeAvatarText, { fontSize: scaleLogin(12) }]}>A</Text>
              </View>
              <Text style={[styles.devModeText, { fontSize: scaleLogin(13) }]}>
                {isAuthenticating ? "Signing in" : "Continue in dev mode"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}
