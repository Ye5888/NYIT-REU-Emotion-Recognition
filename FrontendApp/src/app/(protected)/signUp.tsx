import { useRouter } from 'expo-router';

import { signUpUser } from '../../service/authService';
import { useAuth } from '@/hooks/useAuth';

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useEffect, useState } from 'react';

export default function LoginScreen() {
  const router = useRouter();
  const { user, setUser } = useAuth();

  const [signUpCredentials, setSignUpCredentials] = useState< {username?:string, password?:string, retypePassword?:string} | null >(null);

  useEffect(() => {
    if(user){
      const timeout = setTimeout(() => {router.push('/consent')}, 3000);
      return () => clearTimeout(timeout);
    }
  },[user]);

  const signUp = async () => {
    if(signUpCredentials?.password === signUpCredentials?.retypePassword && signUpCredentials?.password && signUpCredentials?.username){
      const authenticatedUser = await signUpUser({username:signUpCredentials?.username, password:signUpCredentials?.password});
      setUser(authenticatedUser ? authenticatedUser : null);
    };
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Sign Up</Text>

            <Text style={styles.subtitle}>
              Don't Have an Account? Sign Up!
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
                value={signUpCredentials?.username}
                onChangeText={input => {setSignUpCredentials(prev => ({...prev, username:input}))}}
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
                value={signUpCredentials?.password}
                onChangeText={input => {setSignUpCredentials(prev => ({...prev, password:input}))}}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Retype Password</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                value={signUpCredentials?.retypePassword}
                onChangeText={input => {setSignUpCredentials(prev => ({...prev, retypePassword:input}))}}
              />
            </View>

            { !(signUpCredentials?.password && signUpCredentials?.retypePassword)  ? <></> : signUpCredentials?.password === signUpCredentials?.retypePassword ? <Text>Passwords Match!</Text> : <Text>Passwords Do Not Match</Text> }

            <Pressable style={styles.loginButton} onPress={signUp}>
              <Text style={styles.loginButtonText}>
                Create User
              </Text>
            </Pressable>
              { user ? <Text>Signed Up!</Text> : user === null ? <Text>failed to sign up</Text> : <></>}
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
});
