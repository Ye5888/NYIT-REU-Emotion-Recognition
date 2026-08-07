import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function ChooseScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>What would you like to do?</Text>

        <Pressable style={styles.button} onPress={() => router.push('/consent')}>
          <Text style={styles.buttonText}>Participate in Study</Text>
        </Pressable>

        <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => router.push('/(protected)/learn')}>
          <Text style={[styles.buttonText, styles.secondaryText]}>Learn Something New</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#111111', marginBottom: 24, textAlign: 'center' },
  button: { height: 54, borderRadius: 10, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#111111' },
  secondaryText: { color: '#111111' },
});