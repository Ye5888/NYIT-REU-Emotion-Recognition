import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PlaceholderScreen } from '@/components/experiment/placeholder-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { DATA_CATEGORIES, DATA_CATEGORY_LABELS } from '@/experiment/config';
import { Button } from 'expo-router/build/react-navigation';
import { useState } from 'react';
import { updateUser } from '@/service/authService';
import { useAuth } from '@/hooks/useAuth';

export default function ConsentScreen() {
  const router = useRouter();

  const [preferences, setPreferences] = useState<{webcam:boolean, audio:boolean, behavioralTraces:boolean, modelParams:boolean}>({webcam:false, audio:false, behavioralTraces:false, modelParams:false});

  const { user, setUser } = useAuth(); 

  const nextScreen = async () => {
    await updateUser({userId:user?.userId, preferences: preferences});
    router.push('/pretest')
  }; 

  return (
    <PlaceholderScreen
      step="Consent"
      title="What you'll share"
      blurb="You choose, per item, what data to share (Cao's privacy-by-design). Nothing leaves your device until you submit at the end — and once submitted, an item can't be taken back, though you can always share more."
      todos={[
        'Real per-category toggles → writes session.consent.current',
        'Explain capture vs submission (data leaves the device only on submit)',
        'Category list below is rendered from config.ts (single source of truth)',
      ]}
      continueLabel="Continue"
      onContinue={nextScreen}>
      <View style={styles.list}>
        {DATA_CATEGORIES.map((cat) => (
          <ThemedView key={cat} type="backgroundElement" style={styles.row}>
            <ThemedText type="small">{DATA_CATEGORY_LABELS[cat]}</ThemedText>
            {/* <ThemedText type="small" themeColor="textSecondary">
              (toggle — TBD)
            </ThemedText> */}
            <Button 
              color={preferences[cat] ? '#3e82ff':'#eefbff'}
              style={preferences[cat] ? {backgroundColor:"#eefbff", borderColor:"#3e82ff", borderWidth:2} : {backgroundColor:"#3e82ff", borderColor:"#3e82ff", borderWidth:2}} 
              onPressIn={()=>{setPreferences(prev => ({...prev, [cat]:!prev[cat]}))}}>
                {preferences[cat] ? 'On' : 'Off'}
            </Button>
          </ThemedView>
        ))}
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.one, marginTop: Spacing.two },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
});
