import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { setAuthToken } from '@/experiment/api';

const API_URL = process.env.EXPO_PUBLIC_API_BASE || 'http://34.63.101.16:5000';

export default function SignupScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<null | 'success' | 'error'>(null);

  const handleSignup = async () => {
    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        setAuthToken(result.token);
        setStatus('success');
        setTimeout(() => router.push('/consent'), 1500);
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to participate in the study.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput style={styles.input} placeholder="Choose a username" placeholderTextColor="#999" autoCapitalize="none" value={username} onChangeText={setUsername} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} placeholder="Choose a password" placeholderTextColor="#999" secureTextEntry autoCapitalize="none" value={password} onChangeText={setPassword} />
          </View>

          <Pressable style={styles.button} onPress={handleSignup}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </Pressable>

          {status === 'success' && <Text>Account created! Redirecting...</Text>}
          {status === 'error' && <Text>Signup failed. Try a different username.</Text>}

          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.loginLink}>Already have an account? Log in</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  header: { marginBottom: 40 },
  title: { fontSize: 34, fontWeight: "700", color: "#111111", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "#777777", lineHeight: 24 },
  form: { gap: 22 },
  inputGroup: { gap: 8 },
  label: { fontSize: 15, fontWeight: "600", color: "#222222" },
  input: { height: 54, borderWidth: 1, borderColor: "#D6D6D6", borderRadius: 10, paddingHorizontal: 16, fontSize: 16, color: "#111111", backgroundColor: "#FAFAFA" },
  button: { height: 54, borderRadius: 10, backgroundColor: "#111111", alignItems: "center", justifyContent: "center", marginTop: 8 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  loginLink: { color: "#777777", fontSize: 14, textAlign: "center", marginTop: 12 },
});