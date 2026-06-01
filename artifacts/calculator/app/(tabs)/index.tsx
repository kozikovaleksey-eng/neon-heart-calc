import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PALETTE = {
  background: "#0D0011",
  numberBtn: "#280039",
  specialBtn: "#3D0058",
  operatorBtn: "#FF2D78",
  equalsBtn: "#FF69B4",
  displayText: "#FFFFFF",
  expressionText: "#FF69B4",
  numberText: "#FFE0F0",
  specialText: "#FF69B4",
  operatorText: "#FFFFFF",
  glow: "#FF2D78",
  heartColors: ["#FF2D78", "#FF69B4", "#FFB3D1", "#FF1493", "#FF85C2", "#FFAED9"],
};

interface Heart {
  id: number;
  x: number;
  y: number;
  anim: Animated.Value;
  size: number;
  driftX: number;
  color: string;
  char: string;
}

type BtnType = "number" | "operator" | "special" | "equals" | "zero";

interface Btn {
  label: string;
  type: BtnType;
}

const ROWS: Btn[][] = [
  [
    { label: "C", type: "special" },
    { label: "+/-", type: "special" },
    { label: "%", type: "special" },
    { label: "÷", type: "operator" },
  ],
  [
    { label: "7", type: "number" },
    { label: "8", type: "number" },
    { label: "9", type: "number" },
    { label: "×", type: "operator" },
  ],
  [
    { label: "4", type: "number" },
    { label: "5", type: "number" },
    { label: "6", type: "number" },
    { label: "-", type: "operator" },
  ],
  [
    { label: "1", type: "number" },
    { label: "2", type: "number" },
    { label: "3", type: "number" },
    { label: "+", type: "operator" },
  ],
  [
    { label: "0", type: "zero" },
    { label: ".", type: "number" },
    { label: "=", type: "equals" },
  ],
];

const GAP = 10;
const H_PAD = 16;

let heartCounter = 0;

export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Safe area adjustments for Android
  const statusBarH = Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 0;
  const topPad = Platform.OS === "android" ? statusBarH : insets.top;
  const botPad = Math.max(insets.bottom, Platform.OS === "android" ? 8 : 16);

  // Responsive button size — fit both width AND height
  const usableWidth = width - H_PAD * 2;
  const btnFromWidth = (usableWidth - GAP * 3) / 4;

  const usableHeight = height - topPad - botPad;
  const displayH = Math.max(usableHeight * 0.28, 120);
  const dividerH = 1;
  const dividerMargin = 14;
  const buttonsH = usableHeight - displayH - dividerH - dividerMargin * 2;
  const btnFromHeight = (buttonsH - GAP * 4) / 5;

  const BTN = Math.floor(Math.min(btnFromWidth, btnFromHeight));
  const btnFontSize = Math.max(Math.floor(BTN * 0.36), 18);

  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [firstOp, setFirstOp] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOp, setWaitingForOp] = useState(false);
  const [hearts, setHearts] = useState<Heart[]>([]);

  const spawnHearts = (x: number, y: number) => {
    const count = 4 + Math.floor(Math.random() * 4);
    const next: Heart[] = [];
    for (let i = 0; i < count; i++) {
      const id = heartCounter++;
      const anim = new Animated.Value(0);
      const size = 14 + Math.random() * 22;
      const driftX = (Math.random() - 0.5) * 120;
      const color = PALETTE.heartColors[Math.floor(Math.random() * PALETTE.heartColors.length)];
      const duration = 900 + Math.random() * 800;
      const delay = i * 40 + Math.random() * 60;
      const char = Math.random() > 0.35 ? "♥" : "♡";

      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
      ]).start(() => {
        setHearts((prev) => prev.filter((h) => h.id !== id));
      });

      next.push({ id, x, y, anim, size, driftX, color, char });
    }
    setHearts((prev) => [...prev.slice(-40), ...next]);
  };

  const compute = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const fmt = (val: string): string => {
    const n = parseFloat(val);
    if (isNaN(n)) return "0";
    const s = parseFloat(n.toPrecision(10)).toString();
    return s.length > 12 ? n.toExponential(4) : s;
  };

  const onNumber = (num: string) => {
    if (waitingForOp) {
      setDisplay(num === "." ? "0." : num);
      setWaitingForOp(false);
      return;
    }
    if (num === "." && display.includes(".")) return;
    if (display.length >= 12) return;
    setDisplay(display === "0" && num !== "." ? num : display + num);
  };

  const onOperator = (op: string) => {
    const cur = parseFloat(display);
    if (firstOp !== null && !waitingForOp) {
      const res = fmt(String(compute(parseFloat(firstOp), cur, operator!)));
      setDisplay(res);
      setFirstOp(res);
      setExpression(res + "  " + op);
    } else {
      setFirstOp(display);
      setExpression(display + "  " + op);
    }
    setOperator(op);
    setWaitingForOp(true);
  };

  const onEquals = () => {
    if (firstOp === null || operator === null || waitingForOp) return;
    const res = fmt(String(compute(parseFloat(firstOp), parseFloat(display), operator)));
    setExpression(firstOp + " " + operator + " " + display + " =");
    setDisplay(res);
    setFirstOp(null);
    setOperator(null);
    setWaitingForOp(false);
  };

  const onSpecial = (label: string) => {
    if (label === "C") {
      setDisplay("0");
      setExpression("");
      setFirstOp(null);
      setOperator(null);
      setWaitingForOp(false);
    } else if (label === "+/-") {
      setDisplay(display.startsWith("-") ? display.slice(1) : "-" + display);
    } else if (label === "%") {
      setDisplay(fmt(String(parseFloat(display) / 100)));
    }
  };

  const onPress = (btn: Btn, pageX: number, pageY: number) => {
    spawnHearts(pageX, pageY);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (btn.type === "number" || btn.type === "zero") onNumber(btn.label);
    else if (btn.type === "operator") onOperator(btn.label);
    else if (btn.type === "equals") onEquals();
    else onSpecial(btn.label);
  };

  const isActive = (btn: Btn) =>
    btn.type === "operator" && btn.label === operator && waitingForOp;

  const displayFontSize = display.length > 9 ? 32 : display.length > 6 ? 44 : Math.min(60, displayH * 0.45);

  const btnRadius = BTN / 2;

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: PALETTE.background, paddingTop: topPad, paddingBottom: botPad },
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={PALETTE.background}
        translucent={false}
      />

      {/* Display area */}
      <View style={[styles.display, { height: displayH }]}>
        <Text style={styles.expression} numberOfLines={1}>
          {expression}
        </Text>
        <Text
          style={[styles.displayNum, { fontSize: displayFontSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
        >
          {display}
        </Text>
      </View>

      {/* Divider */}
      <View
        style={[
          styles.divider,
          { marginVertical: dividerMargin, shadowColor: PALETTE.glow },
        ]}
      />

      {/* Button grid */}
      <View style={[styles.grid, { gap: GAP }]}>
        {ROWS.map((row, ri) => (
          <View key={ri} style={[styles.row, { gap: GAP }]}>
            {row.map((btn, ci) => {
              const isZero = btn.type === "zero";
              const isOp = btn.type === "operator";
              const isEq = btn.type === "equals";
              const isSpec = btn.type === "special";

              const bg = isActive(btn)
                ? "#FFFFFF"
                : isOp
                ? PALETTE.operatorBtn
                : isEq
                ? PALETTE.equalsBtn
                : isSpec
                ? PALETTE.specialBtn
                : PALETTE.numberBtn;

              const txtColor = isOp || isEq ? PALETTE.operatorText : isSpec ? PALETTE.specialText : PALETTE.numberText;

              return (
                <Pressable
                  key={ci}
                  style={({ pressed }) => ({
                    width: isZero ? BTN * 2 + GAP : BTN,
                    height: BTN,
                    borderRadius: btnRadius,
                    backgroundColor: bg,
                    alignItems: isZero ? "flex-start" : "center",
                    justifyContent: "center",
                    paddingLeft: isZero ? Math.round(BTN * 0.42) : 0,
                    opacity: pressed ? 0.65 : 1,
                    transform: pressed ? [{ scale: 0.94 }] : [],
                    elevation: isOp || isEq ? 6 : 2,
                  })}
                  onPress={(e) => onPress(btn, e.nativeEvent.pageX, e.nativeEvent.pageY)}
                >
                  <Text
                    style={{
                      fontSize: btnFontSize,
                      color: txtColor,
                      fontFamily: isOp || isEq ? "Inter_600SemiBold" : "Inter_500Medium",
                    }}
                  >
                    {btn.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Hearts overlay — rendered last so it's on top of everything */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
        {hearts.map((h) => (
          <Animated.Text
            key={h.id}
            style={{
              position: "absolute",
              left: h.x - h.size / 2,
              top: h.y - h.size / 2,
              fontSize: h.size,
              color: h.color,
              opacity: h.anim.interpolate({
                inputRange: [0, 0.15, 0.75, 1],
                outputRange: [0, 1, 0.85, 0],
              }),
              transform: [
                { translateY: h.anim.interpolate({ inputRange: [0, 1], outputRange: [0, -260] }) },
                { translateX: h.anim.interpolate({ inputRange: [0, 1], outputRange: [0, h.driftX] }) },
                { scale: h.anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1.3, 0.5] }) },
              ],
            }}
          >
            {h.char}
          </Animated.Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: H_PAD,
  },
  display: {
    justifyContent: "flex-end",
    paddingBottom: 8,
  },
  expression: {
    color: PALETTE.expressionText,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    opacity: 0.85,
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  displayNum: {
    color: PALETTE.displayText,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    letterSpacing: -1,
  },
  divider: {
    height: 1,
    backgroundColor: PALETTE.glow,
    opacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  grid: {
    flexShrink: 1,
  },
  row: {
    flexDirection: "row",
  },
});
