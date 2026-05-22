// Hand-curated placement bank for Afrikaans.
// Each item is multiple-choice; difficulty is a 0..100 score aligned with CEFR.
// We pick items by adaptive difficulty so a quiz is 12 items, never the same one.

export type PlacementMCQ = {
  id: string;
  skill: "vocab" | "grammar" | "reading";
  difficulty: number;
  prompt: string; // shown above the choices
  context?: string; // optional reading passage / context shown above prompt
  choices: string[];
  correctIndex: number;
  explanation: string; // shown after answering
};

export const PLACEMENT_BANK_AF: PlacementMCQ[] = [
  // ---------- A1 (10-25) ----------
  {
    id: "af-vocab-greet-1",
    skill: "vocab",
    difficulty: 10,
    prompt: "How do you say 'Hello' in Afrikaans?",
    choices: ["Tot siens", "Hallo", "Asseblief", "Dankie"],
    correctIndex: 1,
    explanation: "Hallo = Hello. Tot siens = Goodbye. Asseblief = Please. Dankie = Thank you.",
  },
  {
    id: "af-vocab-numbers-1",
    skill: "vocab",
    difficulty: 12,
    prompt: "Which word means 'three'?",
    choices: ["een", "twee", "drie", "vier"],
    correctIndex: 2,
    explanation: "een (1), twee (2), drie (3), vier (4).",
  },
  {
    id: "af-grammar-article-1",
    skill: "grammar",
    difficulty: 15,
    prompt: "Choose the correct article: '___ hond is groot.' (The dog is big.)",
    choices: ["'n", "die", "een", "geen"],
    correctIndex: 1,
    explanation: "'die' is the definite article (the). ''n' is indefinite (a/an).",
  },
  {
    id: "af-vocab-family-1",
    skill: "vocab",
    difficulty: 18,
    prompt: "'My ma' means…",
    choices: ["my father", "my brother", "my mother", "my aunt"],
    correctIndex: 2,
    explanation: "ma = mom/mother. pa = father. broer = brother. tannie = aunt.",
  },
  {
    id: "af-grammar-pronoun-1",
    skill: "grammar",
    difficulty: 20,
    prompt: "Fill in: '___ is honger.' (I am hungry.)",
    choices: ["Jy", "Hy", "Ek", "Ons"],
    correctIndex: 2,
    explanation: "Ek = I. Jy = you. Hy = he. Ons = we.",
  },

  // ---------- A2 (25-40) ----------
  {
    id: "af-grammar-verb-1",
    skill: "grammar",
    difficulty: 26,
    prompt: "Choose the correct verb: 'Sy ___ koffie elke oggend.' (She drinks coffee every morning.)",
    choices: ["drink", "drinks", "gedrink", "drinking"],
    correctIndex: 0,
    explanation: "Afrikaans verbs don't conjugate for person in the present tense. Just the stem: 'drink'.",
  },
  {
    id: "af-vocab-color-1",
    skill: "vocab",
    difficulty: 28,
    prompt: "Which word means 'blue'?",
    choices: ["rooi", "blou", "groen", "geel"],
    correctIndex: 1,
    explanation: "rooi (red), blou (blue), groen (green), geel (yellow).",
  },
  {
    id: "af-grammar-neg-1",
    skill: "grammar",
    difficulty: 32,
    prompt: "Negate the sentence: 'Ek is moeg.' (I am tired.)",
    choices: [
      "Ek nie is moeg.",
      "Ek is nie moeg.",
      "Ek is nie moeg nie.",
      "Nie ek is moeg nie.",
    ],
    correctIndex: 2,
    explanation: "Afrikaans uses double negation. The pattern is: 'Ek is nie moeg nie.'",
  },
  {
    id: "af-vocab-time-1",
    skill: "vocab",
    difficulty: 30,
    prompt: "'Vandag' means…",
    choices: ["yesterday", "today", "tomorrow", "now"],
    correctIndex: 1,
    explanation: "vandag = today. gister = yesterday. môre = tomorrow. nou = now.",
  },
  {
    id: "af-grammar-plural-1",
    skill: "grammar",
    difficulty: 35,
    prompt: "What is the plural of 'boek' (book)?",
    choices: ["boeks", "boekes", "boeke", "boekies"],
    correctIndex: 2,
    explanation: "Most Afrikaans plurals add -e: boek → boeke. Some take -s. 'boekies' is the diminutive plural.",
  },

  // ---------- B1 (40-55) ----------
  {
    id: "af-grammar-past-1",
    skill: "grammar",
    difficulty: 42,
    prompt: "Put 'werk' (work) into past tense: 'Ek ___ gister.' (I worked yesterday.)",
    choices: ["werk", "het gewerk", "gewerk het", "werke"],
    correctIndex: 1,
    explanation: "Afrikaans past tense is built with 'het' + 'ge-' prefix: het gewerk.",
  },
  {
    id: "af-reading-1",
    skill: "reading",
    difficulty: 45,
    prompt: "What does the passage say Pieter does on Saturday?",
    context:
      "Pieter staan elke Saterdag vroeg op. Hy drink koffie en lees die koerant. Daarna gaan stap hy in die park saam met sy hond.",
    choices: [
      "He works in the morning.",
      "He sleeps late.",
      "He drinks coffee, reads the newspaper, then walks his dog.",
      "He goes shopping.",
    ],
    correctIndex: 2,
    explanation: "The passage says he gets up early, drinks coffee, reads the paper, then walks in the park with his dog.",
  },
  {
    id: "af-grammar-word-order-1",
    skill: "grammar",
    difficulty: 48,
    prompt: "Choose the correctly ordered sentence:",
    choices: [
      "Môre ek gaan winkels toe.",
      "Môre gaan ek winkels toe.",
      "Ek môre gaan winkels toe.",
      "Gaan ek môre winkels toe.",
    ],
    correctIndex: 1,
    explanation: "Afrikaans is V2 (verb-second) in main clauses. When a time adverb starts, the verb still comes second.",
  },
  {
    id: "af-vocab-idiom-1",
    skill: "vocab",
    difficulty: 50,
    prompt: "What does 'lekker' mean in 'Dit was lekker'?",
    choices: ["unfortunate", "loud", "nice/pleasant", "expensive"],
    correctIndex: 2,
    explanation: "'lekker' is one of Afrikaans's most useful words. It means nice, tasty, pleasant, fun — context dependent.",
  },

  // ---------- B2 (55-70) ----------
  {
    id: "af-grammar-sub-1",
    skill: "grammar",
    difficulty: 58,
    prompt: "Choose the correct subordinate clause: 'Ek weet ___ .'",
    choices: [
      "dat hy is hier",
      "dat hy hier is",
      "dat is hy hier",
      "hy dat hier is",
    ],
    correctIndex: 1,
    explanation: "After 'dat' (that), the verb moves to the end of the subordinate clause: 'dat hy hier is'.",
  },
  {
    id: "af-reading-2",
    skill: "reading",
    difficulty: 62,
    prompt: "Why did Anna apologize?",
    context:
      "Anna het laat by die werk aangekom omdat haar motor nie wou vat nie. Sy het haar baas gebel om verskoning te vra en belowe om die ure later in te haal.",
    choices: [
      "She forgot her laptop at home.",
      "Her car would not start, so she was late.",
      "She had an argument with her boss.",
      "She wanted a day off.",
    ],
    correctIndex: 1,
    explanation: "'haar motor nie wou vat nie' literally 'her car didn't want to grip/catch' — idiomatic for 'wouldn't start'.",
  },
  {
    id: "af-vocab-advanced-1",
    skill: "vocab",
    difficulty: 65,
    prompt: "What does 'oorweldig' mean?",
    choices: ["confused", "overwhelmed", "delighted", "exhausted"],
    correctIndex: 1,
    explanation: "oorweldig = overwhelmed. From 'oor' (over) + 'weld-' (to overcome).",
  },
  {
    id: "af-grammar-passive-1",
    skill: "grammar",
    difficulty: 68,
    prompt: "Which sentence uses the passive voice correctly?",
    choices: [
      "Die huis is gebou deur die argitek.",
      "Die huis bou die argitek.",
      "Die argitek is gebou die huis.",
      "Die huis word deur die argitek.",
    ],
    correctIndex: 0,
    explanation: "Passive: 'word/is + past participle + deur (by)'. 'Die huis is gebou deur die argitek.'",
  },

  // ---------- C1 (70-85) ----------
  {
    id: "af-reading-3",
    skill: "reading",
    difficulty: 75,
    prompt: "What is the author's main point?",
    context:
      "Hoewel tegnologie ons lewens vergemaklik, raak ons toenemend afhanklik daarvan. Die jonger geslag, opgegroei met slimfone in die hand, weet skaars hoe om sonder konstante verbinding te funksioneer.",
    choices: [
      "Technology has only positive effects on society.",
      "Younger people are better at using technology.",
      "Technology makes life easier but creates problematic dependence.",
      "Smartphones should be banned for children.",
    ],
    correctIndex: 2,
    explanation: "The author acknowledges convenience but warns about growing dependence, especially among the smartphone generation.",
  },
  {
    id: "af-vocab-nuance-1",
    skill: "vocab",
    difficulty: 78,
    prompt: "Choose the best translation for 'a fleeting moment': 'n ___ oomblik",
    choices: ["lang", "verbygaande", "stil", "swaar"],
    correctIndex: 1,
    explanation: "verbygaande = fleeting / passing. Literally 'going-by'.",
  },
  {
    id: "af-grammar-conditional-1",
    skill: "grammar",
    difficulty: 82,
    prompt: "Complete: 'As ek tyd ___, ___ ek meer gelees het.'",
    choices: [
      "het, sou",
      "gehad het, sou",
      "het gehad, sal",
      "is, het",
    ],
    correctIndex: 1,
    explanation: "Past unreal conditional: 'As ek tyd gehad het, sou ek meer gelees het.' (If I had had time, I would have read more.)",
  },
];

export function pickItemByDifficulty(
  target: number,
  excludeIds: Set<string>,
): PlacementMCQ | null {
  const pool = PLACEMENT_BANK_AF.filter((i) => !excludeIds.has(i.id));
  if (pool.length === 0) return null;
  pool.sort((a, b) => Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target));
  // Pick from the top 3 closest to add a little variety.
  const top = pool.slice(0, Math.min(3, pool.length));
  return top[Math.floor(Math.random() * top.length)];
}
