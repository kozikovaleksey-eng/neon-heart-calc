import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
    { label: "AC", type: "special" },
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

let heartCounter = 0;

const GAP = 12;
const H_PAD = 20;
const BTN = (SCREEN_WIDTH - H_PAD * 2 - GAP * 3) / 4;

export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();

  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");
  const [firstOp, setFirstOp] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOp, setWaitingForOp] = useState(false);
  const [hearts, setHearts] = useState<Heart[]>([]);

  const spawnHearts = (x: number, y: number) => {
    const count = 5 + Math.floor(Math.random() * 4);
    const next: Heart[] = [];

    for (let i = 0; i < count; i++) {
      const id = heartCounter++;
      const anim = new Animated.Value(0);
      const size = 14 + Math.random() * 24;
      const driftX = (Math.random() - 0.5) * 130;
      const color = PALETTE.heartColors[Math.floor(Math.random() * PALETTE.heartColors.length)];
      const duration = 900 + Math.random() * 800;
      const delay = i * 40 + Math.random() * 60;
      const char = Math.random() > 0.35 ? "♥" : "♡";

      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
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
    if (label === "AC") {
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

  const btnStyle = (btn: Btn) => {
    if (btn.type === "zero") return s.zeroBtn;
    if (btn.type === "operator") return s.operatorBtn;
    if (btn.type === "equals") return s.equalsBtn;
    if (btn.type === "special") return s.specialBtn;
    return s.numberBtn;
  };

  const textStyle = (btn: Btn) => {
    if (btn.type === "operator" || btn.type === "equals") return s.operatorText;
    if (btn.type === "special") return s.specialText;
    return s.numberText;
  };

  const isActive = (btn: Btn) =>
    btn.type === "operator" && btn.label === operator && waitingForOp;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const displaySize = display.length > 9 ? 38 : display.length > 6 ? 52 : 68;

  return (
    <View style={[s.root, { paddingTop: topPad, paddingBottom: botPad }]}>
      <StatusBar barStyle="light-content" />

      {/* Hearts overlay */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
        {hearts.map((h) => (
          <Animated.Text
            key={h.id}
            style={[
              s.heart,
              {
                left: h.x - h.size / 2,
                top: h.y - h.size / 2,
                fontSize: h.size,
                color: h.color,
                opacity: h.anim.interpolate({
                  inputRange: [0, 0.15, 0.75, 1],
                  outputRange: [0, 1, 0.85, 0],
                }),
                transform: [
                  {
                    translateY: h.anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -300],
                    }),
                  },
                  {
                    translateX: h.anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, h.driftX],
                    }),
                  },
                  {
                    scale: h.anim.interpolate({
                      inputRange: [0, 0.3, 1],
                      outputRange: [0.2, 1.3, 0.5],
                    }),
                  },
                ],
              },
            ]}
          >
            {h.char}
          </Animated.Text>
        ))}
      </View>

      {/* Display area */}
      <View style={s.display}>
        <Text style={s.expression} numberOfLines={1}>
          {expression}
        </Text>
        <Text
          style={[s.displayNum, { fontSize: displaySize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.4}
        >
          {display}
        </Text>
      </View>

      {/* Divider glow */}
      <View style={s.divider} />

      {/* Button grid */}
      <View style={s.grid}>
        {ROWS.map((row, ri) => (
          <View key={ri} style={s.row}>
            {row.map((btn, ci) => (
              <Pressable
                key={ci}
                style={({ pressed }) => [
                  s.btn,
                  btnStyle(btn),
                  isActive(btn) && s.activeOp,
                  pressed && s.pressed,
                ]}
                onPress={(e) => onPress(btn, e.nativeEvent.pageX, e.nativeEvent.pageY)}
              >
                <Text style={[s.btnText, textStyle(btn)]}>{btn.label}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PALETTE.background,
    paddingHorizontal: H_PAD,
  },
  display: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 16,
  },
  expression: {
    color: PALETTE.expressionText,
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    opacity: 0.85,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  displayNum: {
    color: PALETTE.displayText,
    fontFamily: "Inter_700Bold",
    textAlign: "right",
    letterSpacing: -2,
  },
  divider: {
    height: 1,
    backgroundColor: PALETTE.glow,
    opacity: 0.5,
    marginBottom: 18,
    shadowColor: PALETTE.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 4,
  },
  grid: {
    gap: GAP,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    gap: GAP,
  },
  btn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN,
    alignItems: "center",
    justifyContent: "center",
  },
  zeroBtn: {
    width: BTN * 2 + GAP,
    height: BTN,
    borderRadius: BTN,
    backgroundColor: PALETTE.numberBtn,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: BTN * 0.42,
  },
  numberBtn: {
    backgroundColor: PALETTE.numberBtn,
    shadowColor: "#FF2D78",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  specialBtn: {
    backgroundColor: PALETTE.specialBtn,
    shadowColor: "#FF69B4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  operatorBtn: {
    backgroundColor: PALETTE.operatorBtn,
    shadowColor: "#FF2D78",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 6,
  },
  equalsBtn: {
    backgroundColor: PALETTE.equalsBtn,
    shadowColor: "#FF69B4",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 6,
  },
  activeOp: {
    backgroundColor: "#FFFFFF",
  },
  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.93 }],
  },
  btnText: {
    fontSize: 26,
    fontFamily: "Inter_500Medium",
  },
  numberText: {
    color: PALETTE.numberText,
  },
  specialText: {
    color: PALETTE.specialText,
  },
  operatorText: {
    color: PALETTE.operatorText,
    fontFamily: "Inter_600SemiBold",
  },
  heart: {
    position: "absolute",
  },
});
