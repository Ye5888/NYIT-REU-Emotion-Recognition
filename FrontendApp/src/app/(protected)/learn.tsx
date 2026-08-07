import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useEffect } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { getAuthToken } from '@/experiment/api';
import { CameraPreview } from '@/components/experiment/camera-preview';


const API_URL = process.env.EXPO_PUBLIC_API_BASE || 'http://34.63.101.16:5000';

type Flashcard = {
    term: string;
    option_a: string;
    option_b: string;
    correct_key: 'A' | 'B';
};

export default function LearnScreen() {
    const router = useRouter();
    const [topic, setTopic] = useState('');
    const [started, setStarted] = useState(false);
    const [flashcard, setFlashcard] = useState<Flashcard | null>(null);
    const [selected, setSelected] = useState<'A' | 'B' | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [correctCount, setCorrectCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [complete, setComplete] = useState(false);
    const [accuracy, setAccuracy] = useState(0);
    const [showCamera, setShowCamera] = useState(true);

    // useEffect(() => {
    //     if (!getAuthToken()) {
    //         router.replace('/login');
    //     }
    // }, []);


    const startSession = async () => {
        const token = getAuthToken();
        try {
            const res = await fetch(`${API_URL}/learning/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ topic }),
            });
            const card = await res.json();
            console.log('Response:', res.status, card);
            setFlashcard(card);
            setStarted(true);
        } catch (error) {
            console.error('Fetch error:', error);
            alert('Error: ' + error);
        }
    };

    const submitAnswer = async (choice: 'A' | 'B') => {
        if (!flashcard || selected) return;
        setSelected(choice);

        const isCorrect = choice === flashcard.correct_key;
        setFeedback(isCorrect ? 'correct' : 'wrong');

        const newCorrect = correctCount + (isCorrect ? 1 : 0);
        const newTotal = totalCount + 1;
        setCorrectCount(newCorrect);
        setTotalCount(newTotal);

        setTimeout(async () => {
            const token = getAuthToken();
            const res = await fetch(`${API_URL}/learning/answer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    topic,
                    correct: isCorrect,
                    correct_count: newCorrect,
                    total_count: newTotal,
                    emotion: null,
                }),
            });

            const data = await res.json();
            setSelected(null);
            setFeedback(null);

            if (data.status === 'complete') {
                setComplete(true);
                setAccuracy(data.accuracy);
            } else {
                setFlashcard(data.flashcard);
            }
        }, 1500);
    };

    if (complete) {
        return (
            <View style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.title}>Session Complete</Text>
                    <Text style={styles.subtitle}>
                        You answered {correctCount} out of {totalCount} correctly ({Math.round(accuracy * 100)}%).
                    </Text>
                    <Pressable style={styles.button} onPress={() => router.back()}>
                        <Text style={styles.buttonText}>Done</Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    if (!started) {
        return (
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Learn Something New</Text>
                        <Text style={styles.subtitle}>{"Enter a topic and we'll generate flashcards for you."}</Text>
                    </View>
                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Topic</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. photosynthesis, World War 2"
                                placeholderTextColor="#999"
                                value={topic}
                                onChangeText={setTopic}
                            />
                        </View>
                        <Pressable style={styles.button} onPress={startSession}>
                            <Text style={styles.buttonText}>Start Learning</Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.progress}>{correctCount}/{totalCount} correct</Text>
                <Text style={styles.term}>{flashcard?.term}</Text>
                <View style={styles.options}>
                    {(['A', 'B'] as const).map((key) => {
                        const text = key === 'A' ? flashcard?.option_a : flashcard?.option_b;
                        const isSelected = selected === key;
                        const isCorrect = flashcard?.correct_key === key;
                        let bg = '#FAFAFA';
                        if (isSelected && feedback === 'correct') bg = '#D4EDDA';
                        if (isSelected && feedback === 'wrong') bg = '#F8D7DA';
                        if (selected && !isSelected && isCorrect) bg = '#D4EDDA';
                        return (
                            <Pressable
                                key={key}
                                style={[styles.option, { backgroundColor: bg }]}
                                onPress={() => submitAnswer(key)}
                                disabled={!!selected}
                            >
                                <Text style={styles.optionLabel}>{key}</Text>
                                <Text style={styles.optionText}>{text}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
    header: { marginBottom: 40 },
    title: { fontSize: 34, fontWeight: '700', color: '#111111', marginBottom: 10 },
    subtitle: { fontSize: 16, color: '#777777', lineHeight: 24 },
    progress: { fontSize: 14, color: '#777777', textAlign: 'center', marginBottom: 24 },
    term: { fontSize: 22, fontWeight: '700', color: '#111111', textAlign: 'center', marginBottom: 32 },
    options: { gap: 16 },
    option: { borderWidth: 1, borderColor: '#D6D6D6', borderRadius: 12, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    optionLabel: { fontSize: 16, fontWeight: '700', color: '#111111', width: 20 },
    optionText: { fontSize: 16, color: '#333333', flex: 1 },
    form: { gap: 22 },
    inputGroup: { gap: 8 },
    label: { fontSize: 15, fontWeight: '600', color: '#222222' },
    input: { height: 54, borderWidth: 1, borderColor: '#D6D6D6', borderRadius: 10, paddingHorizontal: 16, fontSize: 16, color: '#111111', backgroundColor: '#FAFAFA' },
    button: { height: 54, borderRadius: 10, backgroundColor: '#111111', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

    cameraCorner: {
        position: 'absolute',
        top: 16,
        right: 16,
        alignItems: 'flex-end',
        gap: 8,
    },
    cameraInset: { width: 160, overflow: 'hidden', borderRadius: 8 },
    cameraToggle: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#111111', borderRadius: 6 },
    cameraToggleText: { fontSize: 12, color: '#111111' },
});