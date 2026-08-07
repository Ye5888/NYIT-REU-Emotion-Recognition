import { useRouter } from 'expo-router';

import { loginUser } from '../../service/authService';

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PlaceholderScreen } from '@/components/experiment/placeholder-screen';
import { setAuthToken } from '@/experiment/api';
import { useEffect, useState } from 'react';

export default function LoginScreen() {
  const router = useRouter();

  const [user, setUser] = useState(undefined);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) {
      setTimeout(() => { router.push('/choose') }, 1500)
    }
  }, [user]);

  return (
    // <PlaceholderScreen
    //   step="Account (optional)"
    //   title="Sign in or continue as guest"
    //   blurb="Signing in lets you leave and come back later to submit more of your data on your own time. It's optional — you can do the whole session as a guest."
    //   todos={[
    //     'Username / password fields (real auth TBD — backend, coordinate with Anthony)',
    //     'Return flow: reopen a staged session to submit more',
    //     'Sets session.accountId (thinnest, most uncertain piece — keep minimal)',
    //   ]}
    //   continueLabel="Continue as guest"
    //   onContinue={() => router.push('/consent')}
    // />
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>

            <Text style={styles.subtitle}>
              Log in to continue your session.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={(input) => { setUsername(input) }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={(input) => { setPassword(input) }}
              />
            </View>

            <Pressable style={styles.loginButton} onPress={async () => {
              const user = await loginUser({ username: username, password: password });
              if (user?.token) {
                setAuthToken(user.token);
                sessionStorage.setItem('authToken', user.token);
              }
              setUser(user ? user : null);
            }}>
              <Text style={styles.loginButtonText}>
                Log In
              </Text>
            </Pressable>

            <Pressable onPress={() => router.push('/signup')}>
              <Text style={styles.signupText}>{"Don't have an account? Sign up"}</Text>
            </Pressable>
            {user ? <Text>Logged In!</Text> : user === null ? <Text>failed to log in</Text> : <></>}
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  header: {
    marginBottom: 40,
  },

  title: {
    fontSize: 34,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    color: "#777777",
    lineHeight: 24,
  },

  form: {
    gap: 22,
  },

  inputGroup: {
    gap: 8,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222222",
  },

  input: {
    height: 54,
    borderWidth: 1,
    borderColor: "#D6D6D6",
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111111",
    backgroundColor: "#FAFAFA",
  },

  loginButton: {
    height: 54,
    borderRadius: 10,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  signupText: {
    color: "#777777",
    fontSize: 14,
    textAlign: "center" as const,
    marginTop: 12,
  },
});