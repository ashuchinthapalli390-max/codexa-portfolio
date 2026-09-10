/**
 * CODEXA AGENCY — Cinematic Multilingual Intro Tokens
 * Includes official multilingual brand variants and character glyph cycling pools.
 */

export interface MultilingualVariant {
  language: string;
  nativeName: string;
  text: string;
}

export const CODEXA_MULTILINGUAL_VARIANTS: MultilingualVariant[] = [
  { language: "English", nativeName: "English", text: "CODEXA AGENCY" },
  { language: "Telugu", nativeName: "తెలుగు", text: "కోడెక్సా ఏజెన్సీ" },
  { language: "Hindi", nativeName: "हिन्दी", text: "कोडेक्सा एजेंसी" },
  { language: "Tamil", nativeName: "தமிழ்", text: "கோடெக்ஸா ஏஜென்சி" },
  { language: "Kannada", nativeName: "ಕನ್ನಡ", text: "ಕೋಡೆಕ್సా ఏజెన్సీ" },
  { language: "Malayalam", nativeName: "മലയാളം", text: "കോഡെക്സാ ഏജൻസി" },
  { language: "Bengali", nativeName: "বাংলা", text: "কোডেক্সা এজেন্সি" },
  { language: "Japanese", nativeName: "日本語", text: "コードエクサ・エージェンシー" },
  { language: "Korean", nativeName: "한국어", text: "코덱사 에이전시" },
  { language: "Arabic", nativeName: "العربية", text: "وكالة CODEXA" },
  { language: "Greek", nativeName: "Ελληνικά", text: "CODEXA ΑΓΕΝΣΙΑ" },
];

/**
 * Character glyph pools for "CODEXA AGENCY" slots
 * Index 0: C, 1: O, 2: D, 3: E, 4: X, 5: A, 6: (space), 7: A, 8: G, 9: E, 10: N, 11: C, 12: Y
 */
export const WORDMARK_CHAR_GLYPHS: Record<number, string[]> = {
  0: ["కో", "को", "கோ", "コ", "코", "C", "Ξ", "C"], // C
  1: ["డె", "डे", "டெ", "ー", "덱", "O", "Ω", "O"], // O
  2: ["క్సా", "क्सा", "க்ஸா", "ド", "사", "D", "Δ", "D"], // D
  3: ["ఏ", "ए", "ஏ", "エ", "에", "E", "Σ", "E"], // E
  4: ["జె", "जे", "ஜெ", "ク", "이", "X", "Ψ", "X"], // X
  5: ["న్సీ", "न्सी", "ன்சி", "サ", "전", "A", "Λ", "A"], // A
  6: [" "], // Space
  7: ["ఏ", "ए", "ஏ", "エ", "시", "A", "Δ", "A"], // A
  8: ["జె", "जे", "ஜெ", "ー", "وك", "G", "Γ", "G"], // G
  9: ["న్సీ", "न्सी", "ன்சி", "ジ", "COD", "E", "Ξ", "E"], // E
  10: ["കോ", "को", "கோ", "ェ", "EXA", "N", "Π", "N"], // N
  11: ["ഡെ", "डे", "டெ", "ン", "ΑΓ", "C", "Θ", "C"], // C
  12: ["క్సా", "क्सा", "ன்சி", "シ", "ΕΝ", "Y", "Ψ", "Y"], // Y
};

/**
 * Character glyph pools for dynamic leadership name transformations
 */
export const NAME_GLYPH_POOLS: Record<string, string[]> = {
  A: ["ఆ", "अ", "ஆ", "আ", "ア", "아", "Α", "Λ", "A"],
  S: ["స", "स", "ஸ", "স", "ス", "스", "Σ", "§", "S"],
  H: ["హ", "ह", "ஹ", "হ", "ハ", "하", "Η", "ħ", "H"],
  U: ["ఉ", "उ", "உ", "উ", "ウ", "우", "Υ", "µ", "U"],
  N: ["న", "न", "ந", "ন", "ン", "은", "Ν", "η", "N"],
  J: ["జ", "ज", "ஜ", "জ", "ジ", "지", "Ξ", "Ɉ", "J"],
  Y: ["య", "य", "ய", "য", "ヤ", "야", "Ψ", "¥", "Y"],
  K: ["క", "क", "க", "ক", "カ", "카", "Κ", "κ", "K"],
  I: ["ఇ", "इ", "இ", "ই", "イ", "이", "Ι", "ι", "I"],
  O: ["ఒ", "ओ", "ஒ", "ও", "オ", "오", "Ω", "ø", "O"],
  R: ["ర", "र", "ர", "র", "ラ", "라", "Ρ", "®", "R"],
  E: ["ఎ", "ए", "எ", "এ", "エ", "에", "Ε", "€", "E"],
};

/**
 * Returns an array of morphing glyph frames for a given target character
 */
export function getMorphGlyphsForChar(char: string, index: number = 0): string[] {
  const upper = char.toUpperCase();
  if (upper === " ") return [" "];
  if (NAME_GLYPH_POOLS[upper]) {
    return NAME_GLYPH_POOLS[upper];
  }
  return ["#", "0", "1", "X", upper];
}
