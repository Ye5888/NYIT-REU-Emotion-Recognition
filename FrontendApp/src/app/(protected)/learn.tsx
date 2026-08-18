import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
    TextInput,
} from 'react-native';
import { API_BASE, getAuthToken } from '@/experiment/api';
import { CameraPreview } from '@/components/experiment/camera-preview';
import { useCamera } from '@/experiment/camera';

const API_URL = API_BASE;

type Flashcard = {
    term: string;
    option_a: string;
    option_b: string;
    correct_key: 'A' | 'B';
};

// What comes back once /learning/answer resolves, held until the participant
// taps Continue rather than applied immediately — the wrong-answer explanation
// (if any) needs to actually be read, not flash past on a fixed timer.
type PendingNext = { status: 'complete'; accuracy: number } | { status: 'continue'; flashcard: Flashcard };

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
    const [processing, setProcessing] = useState(false);
    const [chatbotReply, setChatbotReply] = useState<string | null>(null);
    const [pendingNext, setPendingNext] = useState<PendingNext | null>(null);

    const { status: cameraStatus, acquire, beginRecording, stopRecording, release } = useCamera();
    // Whether a recording is actually running right now — checked instead of
    // cameraStatus directly, since React state read right after a setState call
    // in the same async function is still the pre-update value.
    const recordingActiveRef = useRef(false);
    // Groups this run's clips for /predict's optional Firestore label write.
    // Not a full session document (no consent tiers, no schema) — Learn has
    // no consent step of its own, this just ties clips from one run together.
    const sessionKeyRef = useRef<string | null>(null);

    useEffect(() => () => release(), [release]);

    const startSession = async () => {
        const token = getAuthToken();
        sessionKeyRef.current = `learn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        try {
            const res = await fetch(`${API_URL}/learning/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ topic, session_id: sessionKeyRef.current }),
            });
            const card = await res.json();
            console.log('Response:', res.status, card);
            if (!res.ok) {
                alert('Error: ' + (card.error || `Request failed (${res.status})`));
                return;
            }
            setFlashcard(card);
            setStarted(true);

            // Best-effort: a declined/unavailable camera still leaves a working
            // Learn session, just without the emotion-adapted feedback.
            await acquire();
            const startedAt = beginRecording();
            recordingActiveRef.current = startedAt !== null;
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
        setProcessing(true);

        // This stops the clip that spans exactly the flashcard-shown-to-answer
        // window, which is the segment meant to carry the reaction.
        const clip = recordingActiveRef.current ? await stopRecording() : null;

        let emotion: string | null = null;
        let chatbotText: string | null = null;

        if (clip && sessionKeyRef.current) {
            try {
                const chosenText = choice === 'A' ? flashcard.option_a : flashcard.option_b;
                const correctText = flashcard.correct_key === 'A' ? flashcard.option_a : flashcard.option_b;
                const message = isCorrect
                    ? `The student correctly identified "${flashcard.term}" by choosing "${chosenText}".`
                    : `The student was asked about "${flashcard.term}" and incorrectly chose "${chosenText}" instead of the correct answer, "${correctText}".`;

                const form = new FormData();
                form.append('video', clip, `clip-${newTotal}.webm`);
                form.append('session_id', sessionKeyRef.current);
                form.append('student_message', message);
                // Lets /predict skip the chatbot call entirely on a correct
                // answer, instead of generating an explanation just to have
                // the frontend throw it away below.
                form.append('correct', String(isCorrect));

                const token = getAuthToken();
                const predictRes = await fetch(`${API_URL}/predict`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: form,
                });
                if (predictRes.ok) {
                    const predictData = await predictRes.json();
                    emotion = predictData.emotion ?? null;
                    // Only surfaced on a wrong answer — right answers don't need
                    // an explanation, even though the clip still feeds emotion
                    // forward into the next flashcard either way.
                    chatbotText = !isCorrect ? (predictData.chatbot_response ?? null) : null;
                } else {
                    console.error('Predict error:', predictRes.status, await predictRes.text());
                }
            } catch (error) {
                // Emotion detection is best-effort; the flashcard loop still works
                // without it.
                console.error('Predict error:', error);
            }
        }

        // Resume capturing immediately for whatever comes next, whether or not
        // this segment ended up producing a usable clip.
        if (recordingActiveRef.current) {
            const startedAt = beginRecording();
            recordingActiveRef.current = startedAt !== null;
        }

        try {
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
                    session_id: sessionKeyRef.current,
                    emotion,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                alert('Error: ' + (data.error || `Request failed (${res.status})`));
                setSelected(null);
                setFeedback(null);
                return;
            }

            setChatbotReply(chatbotText);
            setPendingNext(
                data.status === 'complete'
                    ? { status: 'complete', accuracy: data.accuracy }
                    : { status: 'continue', flashcard: data.flashcard },
            );
        } catch (error) {
            alert('Error: ' + error);
        } finally {
            setProcessing(false);
        }
    };

    const goNext = () => {
        if (!pendingNext) return;
        setSelected(null);
        setFeedback(null);
        setChatbotReply(null);

        if (pendingNext.status === 'complete') {
            setComplete(true);
            setAccuracy(pendingNext.accuracy);
            release();
        } else {
            setFlashcard(pendingNext.flashcard);
        }
        setPendingNext(null);
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
                        <Text style={styles.notice}>
                            Your camera turns on when you start, so we can tell how you&apos;re
                            feeling and adjust the flashcards to match. You can hide the preview
                            any time; it stops recording when the session ends.
                        </Text>
                        <Pressable style={styles.button} onPress={startSession}>
                            <Text style={styles.buttonText}>Start Learning</Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        );
    }

    const live = cameraStatus === 'ready' || cameraStatus === 'recording';

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

                {selected && (
                    <View style={styles.followUp}>
                        {processing ? (
                            <Text style={styles.processingText}>Thinking...</Text>
                        ) : (
                            <>
                                {chatbotReply && (
                                    <View style={styles.chatbotPanel}>
                                        <Text style={styles.chatbotText}>{chatbotReply}</Text>
                                    </View>
                                )}
                                <Pressable style={styles.button} onPress={goNext}>
                                    <Text style={styles.buttonText}>Continue</Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                )}
            </View>

            {live && (
                <View style={styles.cameraCorner}>
                    {showCamera && (
                        <View style={styles.cameraInset}>
                            <CameraPreview height={120} rounded={false} />
                        </View>
                    )}
                    <Pressable style={styles.cameraToggle} onPress={() => setShowCamera((v) => !v)}>
                        <Text style={styles.cameraToggleText}>{showCamera ? 'Hide camera' : 'Show camera'}</Text>
                    </Pressable>
                </View>
            )}
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
    notice: { fontSize: 13, color: '#777777', lineHeight: 18 },

    followUp: { marginTop: 24, gap: 12 },
    processingText: { fontSize: 14, color: '#777777', textAlign: 'center' },
    chatbotPanel: { borderWidth: 1, borderColor: '#D6D6D6', borderRadius: 12, padding: 16, backgroundColor: '#F5F7FA' },
    chatbotText: { fontSize: 15, color: '#222222', lineHeight: 21 },

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
