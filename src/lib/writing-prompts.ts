// Hand-curated Afrikaans writing-prompt bank.
// Served instantly — no LLM call to generate the prompt. The LLM only runs
// when the learner submits for grading.

import { getSetting, setSetting } from "./storage";

export type WritingPromptItem = {
  id: string;
  difficulty: number; // 0-100, CEFR-aligned (A1≈10-25, A2≈25-40, B1≈40-55, B2≈55-70, C1≈70-85)
  targetStructures: string[];
  promptTextEnglish: string;
  targetWordCount: string;
  modelAnswer: string; // Afrikaans reference for the "peek" button
  encouragement?: string;
};

export const WRITING_PROMPT_BANK_AF: WritingPromptItem[] = [
  // ---------- A1 (10-25) ----------
  {
    id: "af-w-intro-1",
    difficulty: 12,
    targetStructures: ["greetings", "self-intro", "simple-present"],
    promptTextEnglish:
      "Introduce yourself in 3–5 sentences. Include your name, age, and where you live.",
    targetWordCount: "25–40 words",
    modelAnswer:
      "Hallo! My naam is Pieter. Ek is vyf-en-twintig jaar oud. Ek bly in Pretoria. Dit is lekker om jou te ontmoet.",
    encouragement: "Houd dit kort en eenvoudig.",
  },
  {
    id: "af-w-family-1",
    difficulty: 16,
    targetStructures: ["self-intro", "possessives", "basic-vocab-family"],
    promptTextEnglish:
      "Tell me about your family. Mention who they are and one thing about each person.",
    targetWordCount: "30–50 words",
    modelAnswer:
      "Ek het 'n ma, 'n pa en een broer. My ma se naam is Sarah; sy is 'n onderwyser. My pa werk op 'n plaas. My broer Jaco is agtien jaar oud en hy speel rugby.",
  },
  {
    id: "af-w-room-1",
    difficulty: 20,
    targetStructures: ["basic-prepositions", "simple-present", "definite-article"],
    promptTextEnglish: "Describe your bedroom. What is in it and where are things placed?",
    targetWordCount: "30–50 words",
    modelAnswer:
      "My kamer is klein maar lekker. 'n Bed staan by die venster. Op die tafel is my boeke en 'n lamp. My klere hang in die kas teen die muur. Ek hou van my kamer.",
  },
  {
    id: "af-w-color-1",
    difficulty: 15,
    targetStructures: ["self-intro", "simple-present", "omdat-because"],
    promptTextEnglish: "What is your favourite colour? Why do you like it?",
    targetWordCount: "25–40 words",
    modelAnswer:
      "My gunsteling kleur is blou, want dit laat my aan die see dink. Die see is kalm en mooi. Wanneer ek blou sien, voel ek rustig.",
  },
  {
    id: "af-w-day-1",
    difficulty: 22,
    targetStructures: ["simple-present", "basic-vocab-time", "verb-second"],
    promptTextEnglish:
      "Describe a normal day for you. Use 4–6 short sentences from morning to evening.",
    targetWordCount: "30–50 words",
    modelAnswer:
      "Ek staan om sewe-uur op en drink koffie. Daarna gaan ek werk toe. Ek werk tot vyf-uur in die middag. Saans kyk ek TV of lees ek 'n boek. Om elf-uur gaan slaap ek.",
  },

  // ---------- A2 (25-40) ----------
  {
    id: "af-w-routine-1",
    difficulty: 28,
    targetStructures: ["simple-present", "verb-second", "time-adverbs"],
    promptTextEnglish:
      "Describe your morning routine in detail — from waking up until you leave the house.",
    targetWordCount: "50–80 words",
    modelAnswer:
      "Elke oggend staan ek om halfsewe op. Eers gaan ek badkamer toe en stort. Daarna trek ek my klere aan en kam my hare. Ek maak ontbyt — gewoonlik pap met melk en heuning. Terwyl ek eet, lees ek die nuus op my foon. Om sewe-uur drink ek nog 'n koppie koffie. Daarna verlaat ek die huis en vat die bus werk toe.",
  },
  {
    id: "af-w-friend-1",
    difficulty: 30,
    targetStructures: ["possessives", "present-tense", "descriptive-adjectives"],
    promptTextEnglish:
      "Describe your best friend. What are they like, and what do you enjoy doing together?",
    targetWordCount: "50–80 words",
    modelAnswer:
      "My beste vriend heet Tobias. Hy is lank en het bruin hare. Tobias is altyd vrolik en geduldig, en hy lag baie. Ons hou daarvan om saam rugby te kyk en oor kos te praat. Soms gaan ons saam stap of drink koffie by 'n kafee. Hy is soos 'n broer vir my en ek vertrou hom met enigiets.",
  },
  {
    id: "af-w-weekend-1",
    difficulty: 32,
    targetStructures: ["present-tense", "time-expressions", "common-verbs"],
    promptTextEnglish: "What do you usually do on weekends?",
    targetWordCount: "50–80 words",
    modelAnswer:
      "Op Saterdae slaap ek gewoonlik laat en eet 'n stadige ontbyt. In die middag gaan ek inkopies doen of besoek vriende. Soms maak ons saam 'n braai. Sondagoggende is rustig — ek lees die koerant, drink koffie en bel my familie. Soms gaan ek 'n bietjie stap in die park as die weer mooi is.",
  },
  {
    id: "af-w-shop-1",
    difficulty: 36,
    targetStructures: ["past-tense-het-ge", "shopping-vocab"],
    promptTextEnglish:
      "Describe your last trip to the shop yesterday. What did you buy and what happened?",
    targetWordCount: "50–80 words",
    modelAnswer:
      "Gister het ek na die winkel gegaan. Ek het brood, melk en vrugte gekoop. Die appels was lekker en goedkoop, en ek het ook 'n nuwe boek gesien. Ongelukkig was die boek te duur, so ek het dit gelos. Toe ek by die huis kom, het ek alles in die yskas gesit en koffie gemaak.",
  },
  {
    id: "af-w-hobby-1",
    difficulty: 38,
    targetStructures: ["present-tense", "omdat-because", "hobby-vocab"],
    promptTextEnglish: "What is a hobby you enjoy? Describe it and explain why you like it.",
    targetWordCount: "50–80 words",
    modelAnswer:
      "Ek hou baie van kook. Elke week probeer ek 'n nuwe gereg. Dit ontspan my omdat ek met my hande kan werk en oor iets anders kan dink. Wanneer my familie my kos eet en geniet, voel ek baie tevrede. Sometimes maak ek 'n fout, maar dit is hoe mens leer.",
  },

  // ---------- B1 (40-55) ----------
  {
    id: "af-w-holiday-1",
    difficulty: 44,
    targetStructures: ["past-tense-het-ge", "descriptive-vocab", "sequence-words"],
    promptTextEnglish:
      "Describe a memorable holiday. Where did you go, what did you do, and why was it special?",
    targetWordCount: "80–130 words",
    modelAnswer:
      "Verlede jaar het ek en my familie na Hermanus toe gegaan. Ons het by 'n klein huisie naby die see gebly. Elke oggend het ons vroeg opgestaan om walvisse te kyk — soms het ons 'n hele uur gestaan en wag. Dit was 'n wonderlike ervaring; die walvisse was so groot en stil. In die middae het ons na die mark toe gegaan en vars vis geëet. Saans het ons om die vuur gesit en stories vertel. Dit was die beste vakansie wat ek nog gehad het, omdat ons almal saam was sonder telefone en gejaag.",
  },
  {
    id: "af-w-hometown-1",
    difficulty: 46,
    targetStructures: ["descriptive-vocab", "present-tense", "comparatives"],
    promptTextEnglish:
      "Describe the town or city where you grew up. What did you love about it?",
    targetWordCount: "80–130 words",
    modelAnswer:
      "Ek het in 'n klein dorpie in die Karoo grootgeword. Die dorp is stil en die landskap is droog maar pragtig. In die strate ken almal mekaar. Daar is nie veel om te doen nie — een kafee, een winkel, 'n skool — maar die mense maak die dorp lewendig. Saans is die hemel vol sterre, helderder as enige plek wat ek nog gesien het. Wanneer ek terug gaan, voel ek altyd dieselfde rustigheid. Stadiger is soms beter, en daar het ek geleer om stil te wees.",
  },
  {
    id: "af-w-movie-1",
    difficulty: 48,
    targetStructures: ["past-tense-het-ge", "opinion-expressions", "narrative"],
    promptTextEnglish:
      "Describe a movie or book you recently enjoyed. What was it about, and what did you like?",
    targetWordCount: "80–130 words",
    modelAnswer:
      "Onlangs het ek die boek 'Toorberg' deur Etienne van Heerden gelees. Dit gaan oor 'n boerefamilie wat saam moet veg om hul plaas te red. Wat my die meeste getref het, was hoe die karakters se geheime stadig oopgaan. Die skryfstyl is digterlik maar nie moeilik nie. Ek het gehuil by die einde — nie omdat dit hartseer is nie, maar omdat dit so eerlik voel. Ek beveel die boek aan vir enigiemand wat van Suid-Afrikaanse stories hou.",
  },
  {
    id: "af-w-goal-1",
    difficulty: 50,
    targetStructures: ["future-sal", "modal-verbs", "purpose-clauses"],
    promptTextEnglish:
      "What is one goal you have for this year? How will you achieve it?",
    targetWordCount: "80–130 words",
    modelAnswer:
      "My doel vir hierdie jaar is om vloeiend Afrikaans te kan praat. Op die oomblik kan ek genoeg verstaan om gesprekke te volg, maar ek voel nog skaam om te praat. Om dit te bereik, sal ek elke dag oefen — 'n klein bietjie skryf, 'n video kyk, of met 'n vriend chat. Ek beplan ook om elke maand 'n boek in Afrikaans te lees. Dit gaan nie maklik wees nie, maar 'n bietjie elke dag tel meer as baie eenkeer.",
  },
  {
    id: "af-w-challenge-1",
    difficulty: 52,
    targetStructures: ["past-tense-het-ge", "emotional-vocab", "narrative-arc"],
    promptTextEnglish: "Describe a time you overcame a challenge. What happened and what did you learn?",
    targetWordCount: "80–130 words",
    modelAnswer:
      "Een van die moeilikste tye in my lewe was toe ek my werk verloor het. Vir maande het ek aansoeke gestuur en niks gehoor nie. Ek het baie getwyfel aan myself. My familie en vriende het my deurgaans gesteun, en uiteindelik het ek 'n nuwe pos gekry — selfs beter as die vorige een. Wat ek geleer het, is dat geduld en deursetting saam werk. As mens nie opgee nie, kom daar gewoonlik iets goeds uit 'n moeilike tyd.",
  },

  // ---------- B2 (55-70) ----------
  {
    id: "af-w-dreamjob-1",
    difficulty: 58,
    targetStructures: ["conditional-as", "future-sal", "abstract-vocab"],
    promptTextEnglish:
      "Describe your dream job. What would you do, and why would it suit you?",
    targetWordCount: "100–150 words",
    modelAnswer:
      "As ek enige werk in die wêreld kon kies, sou ek 'n dokumentêre regisseur wees. Ek hou van stories vertel, veral stories oor gewone mense wat iets ongewoons doen. As regisseur sou ek kon reis, met interessante mense gesels, en hul stem aan 'n breër gehoor gee. Wat my dink dit by my pas, is dat ek geduldig is en aandagtig luister — twee eienskappe wat 'n goeie dokumentêre maker nodig het. Dit sou nie altyd maklik wees nie, want sulke werk vra lang ure en min sekuriteit, maar die werk self sou betekenisvol voel. Vir my is dit belangrik om iets te doen wat ek glo aan.",
  },
  {
    id: "af-w-tradition-1",
    difficulty: 60,
    targetStructures: ["descriptive-vocab", "cultural-vocab", "narrative"],
    promptTextEnglish:
      "Describe a tradition or custom that's important in your family or culture.",
    targetWordCount: "100–150 words",
    modelAnswer:
      "In ons familie is die Sondagete heilig. Elke Sondag, ongeag waar ons is, kom ons by my ouma se huis bymekaar vir 'n lang middagete. Sy maak altyd dieselfde geregte — geel rys, frikkadelle, atjar — die geur alleen laat my onmiddellik aan haar kombuis dink. Tussen die borde gesels ons oor die week, vertel grappies, en luister na ouma se stories oor die vorige geslag. Niemand mag op sy of haar telefoon werk wees nie. Vir my is hierdie tradisie meer as net 'n maaltyd; dit is hoe ons familie aanmekaar bly. In 'n besige wêreld is dit waardevol om een vaste plek te hê waar tyd stadiger loop.",
  },
  {
    id: "af-w-socialmedia-1",
    difficulty: 63,
    targetStructures: ["opinion-expressions", "argument-structure", "abstract-vocab"],
    promptTextEnglish:
      "Are social media platforms good or bad for society? Argue your view in one paragraph.",
    targetWordCount: "130–180 words",
    modelAnswer:
      "Sosiale media is na my mening 'n tweesnydende swaard. Aan die een kant verbind dit mense oor groot afstande en gee dit 'n stem aan diegene wat anders nie gehoor sou word nie — denkers, kunstenaars, aktiviste. Aan die ander kant beloon die algoritmes verontwaardiging en ingewikkelde idees word vereenvoudig tot slagspreuke. Ek dink die gevaar lê nie in die tegnologie self nie, maar in hoe ons dit gebruik. Wanneer mens dit doelloos rondskuif, voel jy uiteindelik leër; wanneer mens dit gebruik om iets spesifieks te leer of om met regte vriende te praat, kan dit verryk. Die antwoord is nie om weg te draai nie, maar om bewus te kies — minder skok, meer betekenis.",
  },
  {
    id: "af-w-leader-1",
    difficulty: 66,
    targetStructures: ["opinion-expressions", "abstract-vocab", "complex-sentences"],
    promptTextEnglish:
      "What is the most important quality in a good leader? Defend your view.",
    targetWordCount: "130–180 words",
    modelAnswer:
      "Daar word baie gesê oor wat 'n goeie leier maak — visie, kragdadigheid, charisma. Vir my staan een eienskap egter bo alles uit: nederigheid. 'n Leier wat sy of haar eie foute kan erken, skep 'n omgewing waar ander veilig voel om die waarheid te praat. Sonder daardie veiligheid kom slegte besluite ongevraag oor die finale lyn, want niemand wil die boodskapper wees nie. Charisma is opwindend, maar dit kan ook blind maak; visie is belangrik, maar sonder die vermoë om te luister, raak visie verstar. Nederigheid is nie swakheid nie — dit is die rustige selfvertroue om te sê: 'Ek mag verkeerd wees, oortuig my.' Daardie houding bring die beste mense en die beste idees na vore.",
  },

  // ---------- C1 (70-85) ----------
  {
    id: "af-w-tech-1",
    difficulty: 72,
    targetStructures: ["complex-conditional", "abstract-vocab", "balanced-argument"],
    promptTextEnglish:
      "What role should technology play in education? Where is it helpful and where is it not?",
    targetWordCount: "150–200 words",
    modelAnswer:
      "Tegnologie in die klaskamer is nóg wondermiddel nóg vyand — dit hang van die toepassing af. Daar is gevalle waar dit duidelik verryk: 'n leerling op 'n afgeleë plaas kry toegang tot 'n biblioteek wat hy of sy nooit anders sou gesien het nie; 'n onderwyser kan dadelik sien wie sukkel en gerig help. Maar wanneer 'n skerm 'n vervanging vir 'n mens word, gaan iets verlore. Leer is nie net 'n oordrag van inligting nie; dit is 'n verhouding. 'n Algoritme kan 'n probleem aanpas, maar dit kan nie 'n kind in die oog kyk en sien hoe dit by die huis gaan nie. Die vraag is dus nie of ons tegnologie moet gebruik nie, maar wáár dit menslike aandag versterk, en wáár dit dit verdring. Die antwoord verg ouers, opvoeders en ontwerpers wat saam dink — nie net oor wat moontlik is nie, maar oor wat wys is.",
  },
  {
    id: "af-w-climate-1",
    difficulty: 76,
    targetStructures: ["opinion-expressions", "abstract-vocab", "concession"],
    promptTextEnglish:
      "How much responsibility do individuals have in solving climate change?",
    targetWordCount: "150–200 words",
    modelAnswer:
      "Daar is 'n moue narratiwe wat individue se klein keuses — die plastiek strooi, die kort vlug, die rooi vleis — voorhou as die kern van die klimaatkrisis. Hierdie verhaal is gerieflik, maar gevaarlik onvolledig. Die meerderheid van uitstoot kom van 'n handvol industrieë en regerings; geen aantal koffiebekers wat hergebruik word, sal dit verander nie. En tog beteken dit nie dat individue magteloos is nie. Persoonlike keuses vorm gewoontes; gewoontes vorm gemeenskap; gemeenskap vorm beleid. Die werklike taak van die individu lê dalk minder in oneindige selfopoffering en meer in stemmery, in burgerlike druk, in die ondersteuning van organisasies wat werklik invloed het. Skuld dra alleen lei tot moegheid; gemeenskaplike aksie lei tot verandering. Die slimste wat 'n mens kan doen, is dalk om sy of haar eie kleinerigheid binne 'n groter struktuur te erken — en dan in daardie struktuur te werk.",
  },
];

// ---------------------------------------------------------------------------
// Picker
// ---------------------------------------------------------------------------

export function pickWritingPrompt(opts: {
  targetDifficulty: number;
  excludeIds: Set<string>;
  weaknessStructures: string[];
}): WritingPromptItem | null {
  // First pass: avoid recently-shown prompts entirely.
  let pool = WRITING_PROMPT_BANK_AF.filter((p) => !opts.excludeIds.has(p.id));
  // If everything's been seen, fall back to the whole bank.
  if (pool.length === 0) pool = WRITING_PROMPT_BANK_AF.slice();

  // Score combines difficulty proximity with weakness-structure overlap.
  // Higher score = better match.
  const scored = pool
    .map((p) => {
      const diffPenalty = Math.abs(p.difficulty - opts.targetDifficulty);
      const overlap = p.targetStructures.filter((s) =>
        opts.weaknessStructures.includes(s),
      ).length;
      return { p, score: -diffPenalty + overlap * 8 };
    })
    .sort((a, b) => b.score - a.score);

  // Sample from the top 4 so retakes aren't deterministic.
  const top = scored.slice(0, Math.min(4, scored.length));
  return top[Math.floor(Math.random() * top.length)]?.p ?? null;
}

// ---------------------------------------------------------------------------
// Seen-id registry — stored in IndexedDB settings so retakes don't repeat.
// ---------------------------------------------------------------------------

const SEEN_KEY = "seenWritingPromptIds";

export async function getSeenWritingPromptIds(): Promise<Set<string>> {
  const raw = await getSetting(SEEN_KEY);
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export async function markWritingPromptSeen(id: string): Promise<void> {
  const seen = await getSeenWritingPromptIds();
  if (seen.has(id)) return;
  seen.add(id);
  await setSetting(SEEN_KEY, JSON.stringify([...seen]));
}
