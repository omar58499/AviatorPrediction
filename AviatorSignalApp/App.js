import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

const PASSKEYS_STORAGE_KEY = "AVIATOR_SIGNAL_PASSKEYS";
const NEXT_PREDICTION_STORAGE_KEY = "AVIATOR_SIGNAL_NEXT_PREDICTION";
const ADMIN_PIN = "HackBot@";
const MAX_NEXT_PREDICTIONS = 10;

const DEFAULT_PASSKEYS = ["DEMO-1234"];

function normalizeKey(value) {
  return value.trim().toUpperCase();
}

function formatToday() {
  return new Date().toLocaleDateString("en-GB");
}

function createSignal() {
  const roll = Math.random();
  let multiplier;

  if (roll < 0.58) {
    multiplier = 1.1 + Math.random() * 1.4;
  } else if (roll < 0.88) {
    multiplier = 2.5 + Math.random() * 2.5;
  } else {
    multiplier = 5 + Math.random() * 6;
  }

  const predicted = Number(multiplier.toFixed(2));
  const risk = predicted < 1.8 ? "High" : predicted < 3 ? "Medium" : "Low";
  const cashOut = Math.max(1.1, predicted * 0.72).toFixed(2);

  return {
    predicted: predicted.toFixed(2),
    cashOut,
    risk
  };
}

function createSignalFromPrediction(prediction) {
  const predicted = Number(prediction);
  const risk = predicted < 1.8 ? "High" : predicted < 3 ? "Medium" : "Low";
  const cashOut = Math.max(1.1, predicted * 0.72).toFixed(2);

  return {
    predicted: predicted.toFixed(2),
    cashOut,
    risk
  };
}

function formatPredictionValue(value) {
  const parsed = Number(String(value).replace(/x$/i, ""));

  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return parsed.toFixed(2);
}

function createPredictionSlots(values = []) {
  return Array.from({ length: MAX_NEXT_PREDICTIONS }, (_, index) => values[index] || "");
}

export default function App() {
  const [passkeys, setPasskeys] = useState(DEFAULT_PASSKEYS);
  const [enteredPasskey, setEnteredPasskey] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [mode, setMode] = useState("login");
  const [adminPin, setAdminPin] = useState("");
  const [newPasskey, setNewPasskey] = useState("");
  const [nextPredictions, setNextPredictions] = useState([]);
  const [predictionSlots, setPredictionSlots] = useState(createPredictionSlots());
  const [signal, setSignal] = useState(null);
  const [displayPrediction, setDisplayPrediction] = useState("0.00");
  const [isPredicting, setIsPredicting] = useState(false);

  const sortedPasskeys = useMemo(() => [...passkeys].sort(), [passkeys]);
  const flightProgress = useRef(new Animated.Value(0)).current;
  const predictionTimer = useRef(null);
  const hiddenAdminTapCount = useRef(0);
  const hiddenAdminTapTimer = useRef(null);
  const predictionValue = displayPrediction;
  const previousMultipliers = signal ? [signal.cashOut, signal.predicted] : ["2.04", "4.00"];
  const isLoginMode = mode === "login" || mode === "adminLogin";

  useEffect(() => {
    loadPasskeys();
    loadNextPrediction();
  }, []);

  useEffect(() => {
    if (!isUnlocking) {
      return undefined;
    }

    flightProgress.setValue(0);
    const animation = Animated.timing(flightProgress, {
      toValue: 1,
      duration: 5000,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false
    });

    animation.start(({ finished }) => {
      if (finished) {
        setIsUnlocked(true);
        setIsUnlocking(false);
        setSignal(null);
      }
    });

    return () => animation.stop();
  }, [flightProgress, isUnlocking]);

  useEffect(() => {
    return () => {
      if (predictionTimer.current) {
        clearInterval(predictionTimer.current);
      }
      if (hiddenAdminTapTimer.current) {
        clearTimeout(hiddenAdminTapTimer.current);
      }
    };
  }, []);

  async function loadPasskeys() {
    try {
      const saved = await AsyncStorage.getItem(PASSKEYS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPasskeys(parsed);
        }
      }
    } catch {
      setPasskeys(DEFAULT_PASSKEYS);
    }
  }

  async function savePasskeys(nextPasskeys) {
    setPasskeys(nextPasskeys);
    await AsyncStorage.setItem(PASSKEYS_STORAGE_KEY, JSON.stringify(nextPasskeys));
  }

  async function loadNextPrediction() {
    let saved = null;

    try {
      saved = await AsyncStorage.getItem(NEXT_PREDICTION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const values = Array.isArray(parsed) ? parsed : [parsed];
        const predictions = values
          .map(formatPredictionValue)
          .filter(Boolean)
          .slice(0, MAX_NEXT_PREDICTIONS);

        if (predictions.length > 0) {
          setNextPredictions(predictions);
          setPredictionSlots(createPredictionSlots(predictions));
        }
      }
    } catch {
      const parsedLegacyValue = formatPredictionValue(saved);
      const predictions = parsedLegacyValue ? [parsedLegacyValue] : [];
      setNextPredictions(predictions);
      setPredictionSlots(createPredictionSlots(predictions));
    }
  }

  async function saveNextPredictionValues(values) {
    setNextPredictions(values);
    setPredictionSlots(createPredictionSlots(values));
    if (values.length > 0) {
      await AsyncStorage.setItem(NEXT_PREDICTION_STORAGE_KEY, JSON.stringify(values));
    } else {
      await AsyncStorage.removeItem(NEXT_PREDICTION_STORAGE_KEY);
    }
  }

  function unlockApp() {
    const key = normalizeKey(enteredPasskey);

    if (!key) {
      Alert.alert("Passkey required", "Enter a valid passkey to continue.");
      return;
    }

    if (!passkeys.includes(key)) {
      Alert.alert("Access denied", "This passkey is not active.");
      return;
    }

    setIsUnlocking(true);
    setSignal(null);
    setDisplayPrediction("0.00");
  }

  function runPrediction() {
    if (predictionTimer.current) {
      clearInterval(predictionTimer.current);
    }

    const queuedPrediction = nextPredictions[0];
    const nextSignal = queuedPrediction
      ? createSignalFromPrediction(queuedPrediction)
      : createSignal();
    const target = Number(nextSignal.predicted);
    const start = 1;
    const startedAt = Date.now();
    const duration = 4200;

    setSignal(null);
    setIsPredicting(true);
    setDisplayPrediction(start.toFixed(2));

    predictionTimer.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 2.4);
      const current = start + (target - start) * easedProgress;

      setDisplayPrediction(Math.min(current, target).toFixed(2));

      if (progress >= 1) {
        clearInterval(predictionTimer.current);
        predictionTimer.current = null;
        setDisplayPrediction(nextSignal.predicted);
        setSignal(nextSignal);
        setIsPredicting(false);
        if (queuedPrediction) {
          saveNextPredictionValues(nextPredictions.slice(1));
        }
      }
    }, 35);
  }

  function openAdmin() {
    if (adminPin !== ADMIN_PIN) {
      Alert.alert("Admin locked", "Enter the correct admin PIN.");
      return;
    }

    setMode("admin");
    setAdminPin("");
  }

  function handleHiddenAdminTap() {
    if (isUnlocked || mode === "admin") {
      return;
    }

    if (hiddenAdminTapTimer.current) {
      clearTimeout(hiddenAdminTapTimer.current);
    }

    hiddenAdminTapCount.current += 1;

    if (hiddenAdminTapCount.current >= 5) {
      hiddenAdminTapCount.current = 0;
      setMode("adminLogin");
      setAdminPin("");
      return;
    }

    hiddenAdminTapTimer.current = setTimeout(() => {
      hiddenAdminTapCount.current = 0;
    }, 1200);
  }

  async function addPasskey() {
    const key = normalizeKey(newPasskey);

    if (key.length < 4) {
      Alert.alert("Invalid passkey", "Use at least 4 characters.");
      return;
    }

    if (passkeys.includes(key)) {
      Alert.alert("Already exists", "This passkey is already active.");
      return;
    }

    await savePasskeys([...passkeys, key]);
    setNewPasskey("");
  }

  async function removePasskey(key) {
    const nextPasskeys = passkeys.filter((item) => item !== key);
    await savePasskeys(nextPasskeys.length ? nextPasskeys : DEFAULT_PASSKEYS);
  }

  async function saveNextPrediction() {
    const invalidSlotIndex = predictionSlots.findIndex((value) => {
      return value.trim() && !formatPredictionValue(value.trim());
    });

    if (invalidSlotIndex !== -1) {
      Alert.alert(
        "Invalid prediction",
        `Prediction ${invalidSlotIndex + 1} must be a number of 1.00 or higher.`
      );
      return;
    }

    const predictions = predictionSlots
      .map((value) => formatPredictionValue(value.trim()))
      .filter(Boolean)
      .slice(0, MAX_NEXT_PREDICTIONS);

    if (predictions.length === 0) {
      Alert.alert("Invalid prediction", "Enter at least one future prediction.");
      return;
    }

    await saveNextPredictionValues(predictions);
    Alert.alert(
      "Predictions saved",
      `Saved ${predictions.length} of ${MAX_NEXT_PREDICTIONS} future predictions.`
    );
  }

  async function clearNextPrediction() {
    await saveNextPredictionValues([]);
  }

  async function removeNextPrediction(index) {
    await saveNextPredictionValues(nextPredictions.filter((_, itemIndex) => itemIndex !== index));
  }

  function updatePredictionSlot(index, value) {
    setPredictionSlots((currentSlots) =>
      currentSlots.map((slot, itemIndex) => (itemIndex === index ? value : slot))
    );
  }

  function logout() {
    setIsUnlocked(false);
    setIsUnlocking(false);
    setIsPredicting(false);
    if (predictionTimer.current) {
      clearInterval(predictionTimer.current);
      predictionTimer.current = null;
    }
    setEnteredPasskey("");
    setSignal(null);
    setDisplayPrediction("0.00");
    setMode("login");
  }

  const planeTranslateX = flightProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150]
  });
  const planeTranslateY = flightProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [70, -10, -90]
  });
  const planeRotate = flightProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["-12deg", "-28deg"]
  });
  const progressWidth = flightProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"]
  });

  return (
    <SafeAreaView style={[styles.safeArea, isUnlocked ? styles.appSafeArea : null]}>
      <StatusBar
        style={!isUnlocking && (isUnlocked || isLoginMode) ? "light" : "dark"}
      />
      {!isUnlocked && isLoginMode && !isUnlocking ? (
        <>
          <ImageBackground
            source={require("./Lockscreen.jpeg")}
            style={styles.lockBackground}
            resizeMode="cover"
          />
          <View style={styles.lockOverlay} />
        </>
      ) : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.screen,
            !isUnlocked && isLoginMode && !isUnlocking ? styles.lockScreen : null,
            isUnlocking ? styles.animationScreen : null,
            isUnlocked ? styles.signalScreen : null
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {!isUnlocking && !isUnlocked ? (
            <View style={styles.header}>
              <Pressable onPress={handleHiddenAdminTap}>
                <Text
                  style={[
                    styles.brand,
                    !isUnlocked && isLoginMode ? styles.lockText : null
                  ]}
                >
                  Aviator Signal
                </Text>
              </Pressable>
              <Text
                style={[
                  styles.subtle,
                  !isUnlocked && isLoginMode ? styles.lockSubtle : null
                ]}
              >
                Demo estimate, not financial advice
              </Text>
            </View>
          ) : null}

          {isUnlocking ? (
            <View style={styles.animationPanel}>
              <Text style={styles.animationBrand}>Aviator Signal</Text>
              <View style={styles.flightPath}>
                <View style={styles.flightTrail} />
                <Animated.View
                  style={[
                    styles.plane,
                    {
                      transform: [
                        { translateX: planeTranslateX },
                        { translateY: planeTranslateY },
                        { rotate: planeRotate }
                      ]
                    }
                  ]}
                >
                  <View style={styles.planeBody} />
                  <View style={styles.planeWing} />
                  <View style={styles.planeTail} />
                </Animated.View>
              </View>
              <Text style={styles.animationText}>Preparing Signal</Text>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
            </View>
          ) : null}

          {!isUnlocked && !isUnlocking && isLoginMode ? (
            <View style={styles.loginPanel}>
              <Text style={[styles.title, styles.loginTitle]}>Enter Passkey</Text>
              <TextInput
                autoCapitalize="characters"
                placeholder="PASSKEY"
                placeholderTextColor="#8792a2"
                secureTextEntry
                style={[styles.input, styles.loginInput]}
                value={enteredPasskey}
                onChangeText={setEnteredPasskey}
              />
              <Pressable style={styles.primaryButton} onPress={unlockApp}>
                <Text style={styles.primaryButtonText}>Open App</Text>
              </Pressable>

              {mode === "adminLogin" ? (
                <>
                  <View style={styles.adminLogin}>
                    <TextInput
                      placeholder="Admin PIN"
                      placeholderTextColor="#8792a2"
                      secureTextEntry
                      style={[styles.input, styles.adminInput, styles.loginInput]}
                      value={adminPin}
                      onChangeText={setAdminPin}
                    />
                    <Pressable style={styles.secondaryButton} onPress={openAdmin}>
                      <Text style={styles.secondaryButtonText}>Admin</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    style={styles.adminCancelButton}
                    onPress={() => {
                      setMode("login");
                      setAdminPin("");
                    }}
                  >
                    <Text style={styles.adminCancelText}>Hide admin login</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}

          {!isUnlocked && mode === "admin" ? (
            <View style={styles.panel}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>Admin</Text>
                <Pressable
                  style={styles.linkButton}
                  onPress={() => {
                    setMode("login");
                    setAdminPin("");
                  }}
                >
                  <Text style={styles.linkText}>Back</Text>
                </Pressable>
              </View>

              <TextInput
                autoCapitalize="characters"
                placeholder="Create passkey"
                placeholderTextColor="#8792a2"
                style={styles.input}
                value={newPasskey}
                onChangeText={setNewPasskey}
              />
              <Pressable style={styles.primaryButton} onPress={addPasskey}>
                <Text style={styles.primaryButtonText}>Create Passkey</Text>
              </Pressable>

              <Text style={styles.sectionLabel}>
                Next Predictions ({nextPredictions.length}/{MAX_NEXT_PREDICTIONS})
              </Text>
              <View style={styles.predictionSlotsGrid}>
                {predictionSlots.map((value, index) => (
                  <View key={`prediction-slot-${index}`} style={styles.predictionSlot}>
                    <Text style={styles.predictionSlotLabel}>#{index + 1}</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      placeholder="2.45"
                      placeholderTextColor="#8792a2"
                      style={styles.predictionSlotInput}
                      value={value}
                      onChangeText={(nextValue) => updatePredictionSlot(index, nextValue)}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.adminActionRow}>
                <Pressable style={[styles.primaryButton, styles.adminActionButton]} onPress={saveNextPrediction}>
                  <Text style={styles.primaryButtonText}>Save Predictions</Text>
                </Pressable>
                <Pressable style={[styles.secondaryButton, styles.adminActionButton]} onPress={clearNextPrediction}>
                  <Text style={styles.secondaryButtonText}>Clear All</Text>
                </Pressable>
              </View>
              <Text style={styles.adminNote}>
                {nextPredictions.length > 0
                  ? "Saved predictions will be used one by one from #1 to #10."
                  : "Fill any slots above, then save future predictions."}
              </Text>
              {nextPredictions.map((prediction, index) => (
                <View key={`${prediction}-${index}`} style={styles.predictionQueueRow}>
                  <Text style={styles.keyText}>
                    {index + 1}. {prediction}x
                  </Text>
                  <Pressable style={styles.removeButton} onPress={() => removeNextPrediction(index)}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                </View>
              ))}

              <Text style={styles.sectionLabel}>Active Passkeys</Text>
              {sortedPasskeys.map((key) => (
                <View key={key} style={styles.keyRow}>
                  <Text style={styles.keyText}>{key}</Text>
                  <Pressable style={styles.removeButton} onPress={() => removePasskey(key)}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {isUnlocked ? (
            <View style={styles.aviatorPage}>
              <View style={styles.appTopBar}>
                <Text style={styles.appTitle}>Aviator</Text>
                <Pressable style={styles.lockPill} onPress={logout}>
                  <Text style={styles.lockPillText}>Lock</Text>
                </Pressable>
              </View>

              <View style={styles.brandStrip}>
                <Text style={styles.scriptLogo}>Aviator</Text>
              </View>

              <View style={styles.multiplierRow}>
                <Text style={styles.blueMultiplier}>{previousMultipliers[0]}x</Text>
                <Text style={styles.purpleMultiplier}>{previousMultipliers[1]}x</Text>
              </View>

              <View style={styles.predictionCard}>
                <View style={styles.lightBurst}>
                  <View style={styles.rayOne} />
                  <View style={styles.rayTwo} />
                  <View style={styles.rayThree} />
                </View>
                <View style={styles.curveArea}>
                  <View style={styles.redCurve} />
                  <View style={styles.redPlateau} />
                </View>
                <View style={styles.smallPlane}>
                  <View style={styles.smallPlaneBody} />
                  <View style={styles.smallPlaneWing} />
                  <View style={styles.smallPlaneTail} />
                </View>
                <Text style={styles.predictionValue}>{predictionValue}x</Text>
              </View>

              <View style={styles.actionCard}>
                <Text style={styles.dateText}>{formatToday()}</Text>
                <Pressable
                  style={[styles.predictButton, isPredicting ? styles.predictButtonDisabled : null]}
                  onPress={runPrediction}
                  disabled={isPredicting}
                >
                  <Text style={styles.predictButtonText}>
                    {isPredicting ? "SCANNING..." : "GET PREDICTION"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.serverCard}>
                <Text style={styles.serverTitle}>Active Servers</Text>
                <View style={styles.terminal}>
                  <Text style={styles.terminalText}>
                    {">"} Connecting to aviator signal nodes...{"\n"}
                    {">"} Server 01: synced / latency 28ms{"\n"}
                    {">"} Server 02: live multiplier stream active{"\n"}
                    {">"} Pattern buffer: scanning recent rounds{"\n"}
                    {">"} Prediction engine: ready{"\n"}
                    {isPredicting
                      ? "> Rolling multipliers: calculating live curve..."
                      : signal
                      ? `> Last prediction: ${signal.predicted}x / cash out ${signal.cashOut}x / risk ${signal.risk}`
                      : "> Waiting for prediction request..."}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f6f8"
  },
  appSafeArea: {
    backgroundColor: "#03050d"
  },
  lockBackground: {
    ...StyleSheet.absoluteFillObject
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.28)"
  },
  keyboardView: {
    flex: 1
  },
  screen: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20
  },
  signalScreen: {
    backgroundColor: "#03050d",
    justifyContent: "flex-start",
    padding: 14,
    paddingBottom: 28
  },
  lockScreen: {
    backgroundColor: "transparent"
  },
  animationScreen: {
    backgroundColor: "#f3f6f8"
  },
  header: {
    marginBottom: 22
  },
  brand: {
    color: "#1b2430",
    fontSize: 32,
    fontWeight: "800"
  },
  lockText: {
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8
  },
  subtle: {
    color: "#667085",
    fontSize: 14,
    marginTop: 6
  },
  lockSubtle: {
    color: "#eef2f7",
    textShadowColor: "rgba(0, 0, 0, 0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6
  },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#d8e0e7",
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3
  },
  loginPanel: {
    paddingVertical: 18
  },
  animationPanel: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 430,
    paddingVertical: 24
  },
  animationBrand: {
    color: "#1b2430",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 28
  },
  flightPath: {
    alignItems: "center",
    height: 190,
    justifyContent: "center",
    overflow: "hidden",
    width: "100%"
  },
  flightTrail: {
    backgroundColor: "#c62828",
    borderRadius: 999,
    height: 4,
    opacity: 0.25,
    position: "absolute",
    transform: [{ rotate: "-24deg" }],
    width: "78%"
  },
  plane: {
    alignItems: "center",
    height: 74,
    justifyContent: "center",
    width: 130
  },
  planeBody: {
    backgroundColor: "#c62828",
    borderRadius: 999,
    height: 18,
    width: 108
  },
  planeWing: {
    backgroundColor: "#111827",
    borderRadius: 8,
    height: 16,
    position: "absolute",
    transform: [{ rotate: "-32deg" }],
    width: 58
  },
  planeTail: {
    backgroundColor: "#111827",
    borderRadius: 5,
    height: 28,
    left: 12,
    position: "absolute",
    transform: [{ rotate: "28deg" }],
    width: 12
  },
  animationText: {
    color: "#475467",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 20
  },
  progressTrack: {
    backgroundColor: "#d8e0e7",
    borderRadius: 999,
    height: 10,
    marginTop: 18,
    overflow: "hidden",
    width: "82%"
  },
  progressFill: {
    backgroundColor: "#c62828",
    borderRadius: 999,
    height: "100%"
  },
  title: {
    color: "#1b2430",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 14
  },
  loginTitle: {
    color: "#ffffff",
    textShadowColor: "rgba(0, 0, 0, 0.55)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8
  },
  input: {
    backgroundColor: "#f7fafc",
    borderColor: "#cbd5df",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14
  },
  predictionSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  predictionSlot: {
    backgroundColor: "#f7fafc",
    borderColor: "#cbd5df",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  predictionSlotLabel: {
    color: "#667085",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 2
  },
  predictionSlotInput: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "800",
    minHeight: 28,
    padding: 0
  },
  loginInput: {
    backgroundColor: "rgba(247, 250, 252, 0.9)"
  },
  adminInput: {
    flex: 1
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#c62828",
    borderRadius: 8,
    minHeight: 52,
    justifyContent: "center",
    marginTop: 12
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#263238",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontWeight: "800"
  },
  adminLogin: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18
  },
  adminCancelButton: {
    alignSelf: "center",
    marginTop: 12,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  adminCancelText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5
  },
  adminActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },
  adminActionButton: {
    flex: 1,
    marginTop: 0
  },
  adminNote: {
    color: "#667085",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10
  },
  rowBetween: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  linkButton: {
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  linkText: {
    color: "#c62828",
    fontSize: 15,
    fontWeight: "800"
  },
  sectionLabel: {
    color: "#667085",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 20,
    textTransform: "uppercase"
  },
  keyRow: {
    alignItems: "center",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 12
  },
  predictionQueueRow: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    minHeight: 48,
    paddingHorizontal: 12
  },
  keyText: {
    color: "#1f2937",
    fontSize: 15,
    fontWeight: "700"
  },
  removeButton: {
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  removeButtonText: {
    color: "#7f1d1d",
    fontWeight: "800"
  },
  aviatorPage: {
    width: "100%"
  },
  appTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 52,
    position: "relative"
  },
  appTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900"
  },
  lockPill: {
    backgroundColor: "#141927",
    borderColor: "#2b3246",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    position: "absolute",
    right: 0
  },
  lockPillText: {
    color: "#ff315f",
    fontSize: 13,
    fontWeight: "900"
  },
  brandStrip: {
    backgroundColor: "#171d31",
    borderRadius: 4,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14
  },
  scriptLogo: {
    color: "#ff2559",
    fontSize: 20,
    fontStyle: "italic",
    fontWeight: "900"
  },
  multiplierRow: {
    flexDirection: "row",
    gap: 18,
    paddingHorizontal: 28,
    paddingVertical: 14
  },
  blueMultiplier: {
    color: "#23a8ff",
    fontSize: 18,
    fontWeight: "900"
  },
  purpleMultiplier: {
    color: "#8857ff",
    fontSize: 18,
    fontWeight: "900"
  },
  predictionCard: {
    backgroundColor: "#060913",
    borderColor: "#252b3f",
    borderRadius: 8,
    borderWidth: 1,
    height: 230,
    justifyContent: "center",
    overflow: "hidden"
  },
  lightBurst: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  rayOne: {
    backgroundColor: "rgba(0, 158, 255, 0.35)",
    height: 310,
    position: "absolute",
    transform: [{ rotate: "74deg" }],
    width: 42
  },
  rayTwo: {
    backgroundColor: "rgba(0, 108, 255, 0.24)",
    height: 290,
    position: "absolute",
    transform: [{ rotate: "58deg" }],
    width: 70
  },
  rayThree: {
    backgroundColor: "rgba(15, 55, 130, 0.48)",
    height: 320,
    position: "absolute",
    transform: [{ rotate: "96deg" }],
    width: 24
  },
  curveArea: {
    bottom: 0,
    height: 118,
    left: 0,
    position: "absolute",
    right: 0
  },
  redCurve: {
    backgroundColor: "#ff0f4f",
    borderTopRightRadius: 130,
    bottom: -36,
    height: 124,
    left: -16,
    position: "absolute",
    transform: [{ rotate: "-10deg" }],
    width: "72%"
  },
  redPlateau: {
    backgroundColor: "#ff0f4f",
    bottom: 0,
    height: 96,
    left: "50%",
    position: "absolute",
    width: "18%"
  },
  smallPlane: {
    height: 48,
    position: "absolute",
    right: 70,
    top: 46,
    transform: [{ rotate: "-13deg" }],
    width: 78
  },
  smallPlaneBody: {
    backgroundColor: "#ff2559",
    borderRadius: 999,
    height: 12,
    marginTop: 18,
    width: 70
  },
  smallPlaneWing: {
    backgroundColor: "#ff2559",
    borderRadius: 6,
    height: 12,
    left: 24,
    position: "absolute",
    top: 16,
    transform: [{ rotate: "-34deg" }],
    width: 36
  },
  smallPlaneTail: {
    backgroundColor: "#ff2559",
    borderRadius: 4,
    height: 18,
    left: 5,
    position: "absolute",
    top: 11,
    transform: [{ rotate: "30deg" }],
    width: 9
  },
  predictionValue: {
    alignSelf: "center",
    color: "#ff315f",
    fontSize: 54,
    fontWeight: "900",
    textShadowColor: "rgba(0, 171, 255, 0.45)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12
  },
  actionCard: {
    alignItems: "center",
    backgroundColor: "#202740",
    borderColor: "#2b3558",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 12,
    padding: 14
  },
  dateText: {
    color: "#70ff9d",
    fontSize: 18,
    fontWeight: "900"
  },
  predictButton: {
    alignItems: "center",
    backgroundColor: "#36f052",
    borderColor: "#c8ffd2",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
    maxWidth: 210
  },
  predictButtonDisabled: {
    backgroundColor: "#24a63c",
    opacity: 0.85
  },
  predictButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    textShadowColor: "rgba(0, 0, 0, 0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  serverCard: {
    backgroundColor: "#202740",
    borderColor: "#2b3558",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    overflow: "hidden",
    padding: 8
  },
  serverTitle: {
    backgroundColor: "#151b31",
    borderRadius: 8,
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
    paddingVertical: 8,
    textAlign: "center"
  },
  terminal: {
    backgroundColor: "#020403",
    borderColor: "#152414",
    borderRadius: 4,
    borderWidth: 1,
    minHeight: 190,
    padding: 12
  },
  terminalText: {
    color: "#83ff9a",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18
  }
});
