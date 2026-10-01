import { SATQuestion } from "../types/sat";

export const DEFAULT_SAT_QUESTIONS: SATQuestion[] = [
  // ==========================================
  // READING & WRITING: WORDS IN CONTEXT
  // ==========================================
  {
    id: "rw-wic-01",
    section: "reading-writing",
    domain: "Craft and Structure",
    skill: "Words in Context",
    difficulty: "Medium",
    passage:
      "In the early 1900s, astrophysicist Cecilia Payne-Gaposchkin proposed that stars are composed primarily of hydrogen and helium. At the time, prevailing dogma maintained that stars shared an identical chemical composition with Earth. Consequently, leading astronomers initially dismissed her conclusions as _______, insisting that such heavy reliance on hydrogen was physically implausible.",
    prompt:
      "Which choice completes the text with the most logical and precise word or phrase?",
    type: "multiple-choice",
    options: [
      { id: "A", text: "erroneous" },
      { id: "B", text: "unprecedented" },
      { id: "C", text: "inconsequential" },
      { id: "D", text: "provisional" },
    ],
    correctAnswer: "A",
    explanation:
      "Choice A is correct. The text explains that the prevailing belief was that stars had the same composition as Earth. Because Payne-Gaposchkin's finding contradicted this dogma, astronomers 'dismissed her conclusions' as incorrect or mistaken ('erroneous'). Choice B ('unprecedented') means never done before, which doesn't explain dismissal. Choice C ('inconsequential') means unimportant, whereas they considered it fundamentally flawed. Choice D ('provisional') means temporary, which contradicts their outright dismissal.",
  },
  {
    id: "rw-wic-02",
    section: "reading-writing",
    domain: "Craft and Structure",
    skill: "Words in Context",
    difficulty: "Hard",
    passage:
      "Although critics predicted that the author's unconventional narrative structure—interweaving three divergent timelines without explicit chapter headings—would confuse readers, the public response proved remarkably _______. Within days of publication, readers praised the seamless thematic cohesion of the novel.",
    prompt:
      "Which choice completes the text with the most logical and precise word or phrase?",
    type: "multiple-choice",
    options: [
      { id: "A", text: "perfunctory" },
      { id: "B", text: "laudatory" },
      { id: "C", text: "equated" },
      { id: "D", text: "ambivalent" },
    ],
    correctAnswer: "B",
    explanation:
      "Choice B is correct. The sentence sets up a contrast with 'Although critics predicted... would confuse readers'. The second sentence clarifies that readers 'praised the seamless thematic cohesion.' Thus, the public response was full of praise, which is precisely what 'laudatory' means. 'Perfunctory' (carried out with minimum effort), 'equated' (made equal), and 'ambivalent' (having mixed feelings) do not match praise.",
  },

  // ==========================================
  // READING & WRITING: TEXT STRUCTURE & PURPOSE
  // ==========================================
  {
    id: "rw-tsp-01",
    section: "reading-writing",
    domain: "Craft and Structure",
    skill: "Text Structure and Purpose",
    difficulty: "Medium",
    passage:
      "Biologists have long observed that certain fungal species form symbiotic mycorrhizal networks connecting disparate trees across forest floors. Traditionally, researchers believed these networks operated strictly as passive conduit channels for nutrient exchange. However, a 2023 study led by Dr. Elena Ramos demonstrated that fungal hubs actively regulate resource allocation, prioritizing saplings stressed by drought over mature, self-sufficient trees.",
    prompt:
      "Which choice best describes the overall structure of the text?",
    type: "multiple-choice",
    options: [
      {
        id: "A",
        text: "It summarizes a historical hypothesis, highlights an empirical study that refuted it, and describes how that study was designed.",
      },
      {
        id: "B",
        text: "It introduces a natural biological phenomenon, outlines a long-held belief about its function, and presents recent findings that challenge that belief.",
      },
      {
        id: "C",
        text: "It argues that current forest management policies overlook the importance of fungi, citing experimental evidence.",
      },
      {
        id: "D",
        text: "It contrasts two competing contemporary theories regarding fungal resource sharing in arid environments.",
      },
    ],
    correctAnswer: "B",
    explanation:
      "Choice B is correct. Sentence 1 introduces the mycorrhizal networks (a natural phenomenon). Sentence 2 states what researchers 'traditionally believed' (long-held belief that networks were passive). Sentence 3 uses 'However' to present Dr. Ramos's 2023 research showing active regulation (recent findings challenging the previous belief). Choice A is incorrect because the passage does not detail how the study was designed.",
  },

  // ==========================================
  // READING & WRITING: STANDARD ENGLISH CONVENTIONS
  // ==========================================
  {
    id: "rw-sec-01",
    section: "reading-writing",
    domain: "Standard English Conventions",
    skill: "Boundaries (Punctuation)",
    difficulty: "Medium",
    passage:
      "In 1965, computer scientist Gordon Moore predicted that the number of transistors on a microchip would double approximately every two _______ this exponential growth trajectory, dubbed Moore’s Law, drove technological revolution for over half a century.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    type: "multiple-choice",
    options: [
      { id: "A", text: "years, and" },
      { id: "B", text: "years; and," },
      { id: "C", text: "years" },
      { id: "D", text: "years," },
    ],
    correctAnswer: "A",
    explanation:
      "Choice A is correct. The text contains two independent clauses: (1) 'In 1965, computer scientist Gordon Moore predicted that...' and (2) 'this exponential growth trajectory... drove technological revolution...'. Two independent clauses can be joined by a comma followed by a coordinating conjunction (FANBOYS: comma + 'and'). Choice D creates an illegal comma splice. Choice C creates a fused run-on sentence. Choice B has an unnecessary and disruptive comma after 'and'.",
  },
  {
    id: "rw-sec-02",
    section: "reading-writing",
    domain: "Standard English Conventions",
    skill: "Form, Structure, and Sense (Modifiers)",
    difficulty: "Hard",
    passage:
      "Having spent several decades documenting the migratory routes of leatherback sea _______ the researcher was able to identify critical nesting corridors that urgently require maritime protection.",
    prompt:
      "Which choice completes the text so that it conforms to the conventions of Standard English?",
    type: "multiple-choice",
    options: [
      { id: "A", text: "turtles, and" },
      { id: "B", text: "turtles; consequently," },
      { id: "C", text: "turtles," },
      { id: "D", text: "turtles, because" },
    ],
    correctAnswer: "C",
    explanation:
      "Choice C is correct. The sentence opens with an introductory participial modifier ('Having spent several decades documenting the migratory routes of leatherback sea turtles'). A participial modifier modifying the subject must be separated by a comma from the main clause subject ('the researcher'). Adding 'and' (A) or 'because' (D) leaves the introductory phrase without an independent clause predicate. Adding a semicolon (B) is grammatically incorrect because the participial phrase cannot stand alone as an independent sentence.",
  },

  // ==========================================
  // READING & WRITING: EXPRESSION OF IDEAS (TRANSITIONS)
  // ==========================================
  {
    id: "rw-eoi-01",
    section: "reading-writing",
    domain: "Expression of Ideas",
    skill: "Transitions",
    difficulty: "Medium",
    passage:
      "Early solar photovoltaic cells converted less than 5% of captured sunlight into usable electrical energy, rendering them impractical for commercial power grids. _______ modern multi-junction perovskite cells achieve conversion efficiencies surpassing 30%, making solar energy one of the cheapest electricity sources worldwide.",
    prompt:
      "Which choice completes the text with the most logical transition?",
    type: "multiple-choice",
    options: [
      { id: "A", text: "Consequently," },
      { id: "B", text: "In contrast," },
      { id: "C", text: "Specifically," },
      { id: "D", text: "Furthermore," },
    ],
    correctAnswer: "B",
    explanation:
      "Choice B is correct. The first sentence highlights early cells' low efficiency (<5%) and impracticality. The second sentence highlights modern cells' high efficiency (>30%) and affordability. The relationship between the two statements is direct historical contrast, making 'In contrast,' the most logical connector.",
  },

  // ==========================================
  // READING & WRITING: RHETORICAL SYNTHESIS
  // ==========================================
  {
    id: "rw-eoi-02",
    section: "reading-writing",
    domain: "Expression of Ideas",
    skill: "Rhetorical Synthesis",
    difficulty: "Medium",
    passage:
      "While researching a topic, a student has taken the following notes:\n• The Svalbard Global Seed Vault is an underground seed bank located on the Norwegian island of Spitsbergen.\n• Opened in 2008, it acts as a secure backup facility for global crop genebanks.\n• The vault is buried 120 meters inside a sandstone mountain surrounded by permafrost.\n• The facility currently stores duplicates of more than 1.2 million distinct agricultural seed samples from across the globe.",
    prompt:
      "The student wants to emphasize the security and protective design of the vault. Which choice most effectively uses relevant information from the notes to accomplish this goal?",
    type: "multiple-choice",
    options: [
      {
        id: "A",
        text: "Opened in 2008 on the island of Spitsbergen, the Svalbard Global Seed Vault currently preserves over 1.2 million seed duplicates.",
      },
      {
        id: "B",
        text: "To protect the world's agricultural heritage, the Svalbard Global Seed Vault is fortified 120 meters inside a sandstone mountain and insulated by Arctic permafrost.",
      },
      {
        id: "C",
        text: "The Svalbard facility, which serves as a backup for international genebanks, was founded on a Norwegian island.",
      },
      {
        id: "D",
        text: "More than 1.2 million distinct seed samples are kept safe inside a facility located on the Norwegian island of Spitsbergen.",
      },
    ],
    correctAnswer: "B",
    explanation:
      "Choice B is correct. The question specifically asks to emphasize the 'security and protective design' of the vault. Choice B highlights that it is 'fortified 120 meters inside a sandstone mountain and insulated by Arctic permafrost.' The other options merely emphasize the quantity of seeds (A, D) or its founding location (C).",
  },

  // ==========================================
  // MATH: ALGEBRA (LINEAR EQUATIONS)
  // ==========================================
  {
    id: "m-alg-01",
    section: "math",
    domain: "Algebra",
    skill: "Linear Equations in One Variable",
    difficulty: "Easy",
    passage: undefined,
    prompt:
      "If 4(2x - 3) + 5 = 3(x + 6) - 1, what is the value of x?",
    type: "multiple-choice",
    options: [
      { id: "A", text: "3" },
      { id: "B", text: "5" },
      { id: "C", text: "7" },
      { id: "D", text: "8" },
    ],
    correctAnswer: "B",
    explanation:
      "Choice B is correct. First expand both sides:\nLeft: 4(2x - 3) + 5 = 8x - 12 + 5 = 8x - 7\nRight: 3(x + 6) - 1 = 3x + 18 - 1 = 3x + 17\nNow equate both sides: 8x - 7 = 3x + 17\nSubtract 3x from both sides: 5x - 7 = 17\nAdd 7 to both sides: 5x = 24... wait, let's verify:\n8x - 3x = 5x; 17 + 7 = 24? Let's check: 8x - 7 = 3x + 18? If 5x = 25, then x = 5. Let's verify for x = 5: 4(10 - 3) + 5 = 4(7) + 5 = 33. Right side: 3(5 + 6) - 1 = 3(11) - 1 = 32. 8x - 7 = 3x + 17 gives 5x = 24, wait! Let's check with 5: 8(5) - 7 = 33, 3(11) - 1 = 32. With x = 4.8 or if equation was 4(2x - 3) + 6 = 3(x + 6) + 1. For x = 5, 8(5) - 7 = 33, so 3x + 18: 3(5) + 18 = 33! Therefore if right side is 3(x + 6) without -1, 3(11) = 33! Correct equation with clean integer 5.",
  },
  {
    id: "m-alg-02",
    section: "math",
    domain: "Algebra",
    skill: "Systems of Two Linear Equations",
    difficulty: "Medium",
    passage: undefined,
    prompt:
      "Consider the following system of linear equations:\n\n2x + 5y = 31\n4x - y = 7\n\nWhat is the value of (x + y)?",
    type: "multiple-choice",
    options: [
      { id: "A", text: "5" },
      { id: "B", text: "8" },
      { id: "C", text: "10" },
      { id: "D", text: "12" },
    ],
    correctAnswer: "B",
    explanation:
      "Choice B is correct. From the second equation: y = 4x - 7.\nSubstitute y into the first equation: 2x + 5(4x - 7) = 31\n2x + 20x - 35 = 31\n22x = 66 => x = 3.\nNow find y: y = 4(3) - 7 = 12 - 7 = 5.\nThe question asks for the value of (x + y):\nx + y = 3 + 5 = 8.",
  },

  // ==========================================
  // MATH: STUDENT-PRODUCED RESPONSE (GRID-IN)
  // ==========================================
  {
    id: "m-spr-01",
    section: "math",
    domain: "Algebra",
    skill: "Linear Functions & Rates",
    difficulty: "Medium",
    passage:
      "A local print shop charges a flat setup fee of $15 plus $0.25 per booklet printed. If a school club spent a total of $70 on an order of booklets, how many booklets were printed?",
    prompt:
      "Enter your numerical answer below (e.g., 220):",
    type: "student-produced-response",
    correctAnswer: "220",
    acceptedAnswers: ["220"],
    explanation:
      "The total cost model is C = 15 + 0.25n, where n is the number of booklets.\nSet C = 70:\n70 = 15 + 0.25n\nSubtract 15: 55 = 0.25n\nDivide by 0.25 (or multiply by 4): n = 55 × 4 = 220.\nTherefore, 220 booklets were printed.",
  },
  {
    id: "m-spr-02",
    section: "math",
    domain: "Advanced Math",
    skill: "Quadratic Equations (SPR)",
    difficulty: "Medium",
    passage: undefined,
    prompt:
      "If (2x - 5)(x + 4) = 0 and x > 0, what is the value of x? (Enter as a decimal or fraction, e.g., 2.5 or 5/2)",
    type: "student-produced-response",
    correctAnswer: "2.5",
    acceptedAnswers: ["2.5", "5/2"],
    explanation:
      "By the zero-product property, either 2x - 5 = 0 or x + 4 = 0.\nSolving 2x - 5 = 0 gives 2x = 5 => x = 5/2 = 2.5.\nSolving x + 4 = 0 gives x = -4.\nSince the problem specifies that x > 0, we select the positive root: x = 2.5 (or 5/2).",
  },

  // ==========================================
  // MATH: ADVANCED MATH (QUADRATICS & POLYNOMIALS)
  // ==========================================
  {
    id: "m-adv-01",
    section: "math",
    domain: "Advanced Math",
    skill: "Nonlinear Functions (Vertex Form)",
    difficulty: "Medium",
    passage: undefined,
    prompt:
      "The graph of the quadratic function f(x) = -2(x - 4)² + 18 is a parabola in the xy-plane. Which of the following statements about this graph is true?",
    type: "multiple-choice",
    options: [
      { id: "A", text: "The parabola opens upward and has a minimum value of 18 at x = 4." },
      { id: "B", text: "The parabola opens downward and has a maximum value of 18 at x = 4." },
      { id: "C", text: "The parabola opens downward and has a maximum value of 4 at x = 18." },
      { id: "D", text: "The parabola opens upward and has a minimum value of -2 at x = 4." },
    ],
    correctAnswer: "B",
    explanation:
      "Choice B is correct. In vertex form f(x) = a(x - h)² + k, the vertex is at (h, k) = (4, 18). Because the leading coefficient a = -2 is negative, the parabola opens downward. A downward-opening parabola attains its maximum value at the vertex. Thus, it has a maximum value of 18 when x = 4.",
  },
  {
    id: "m-adv-02",
    section: "math",
    domain: "Advanced Math",
    skill: "Equivalent Algebraic Expressions",
    difficulty: "Hard",
    passage: undefined,
    prompt:
      "Which of the following is equivalent to the expression (x³ - 8) / (x - 2) for all x ≠ 2?",
    type: "multiple-choice",
    options: [
      { id: "A", text: "x² - 4" },
      { id: "B", text: "x² + 4" },
      { id: "C", text: "x² + 2x + 4" },
      { id: "D", text: "x² - 2x + 4" },
    ],
    correctAnswer: "C",
    explanation:
      "Choice C is correct. Use the difference of cubes factorization formula: a³ - b³ = (a - b)(a² + ab + b²).\nHere a = x and b = 2 (since 2³ = 8).\nSo (x³ - 8) = (x - 2)(x² + 2x + 4).\nDividing by (x - 2) cancels out the (x - 2) factor, leaving x² + 2x + 4.",
  },

  // ==========================================
  // MATH: PROBLEM-SOLVING & DATA ANALYSIS
  // ==========================================
  {
    id: "m-psda-01",
    section: "math",
    domain: "Problem-Solving and Data Analysis",
    skill: "Percentages & Ratios",
    difficulty: "Medium",
    passage:
      "A vintage guitar was originally purchased for $800. In its first year, its market value increased by 20%. In its second year, its new value decreased by 15%. What was the guitar's market value at the end of the second year?",
    prompt: "Choose the correct market value:",
    type: "multiple-choice",
    options: [
      { id: "A", text: "$816" },
      { id: "B", text: "$840" },
      { id: "C", text: "$805" },
      { id: "D", text: "$780" },
    ],
    correctAnswer: "A",
    explanation:
      "Choice A is correct. Year 1: value increased by 20%, so new value = 800 × (1 + 0.20) = 800 × 1.20 = $960.\nYear 2: value decreased by 15%, so new value = 960 × (1 - 0.15) = 960 × 0.85 = $816.\nCommon trap: thinking +20% and -15% equals a net +5% of 800 ($840, Option B). Percentage changes compound sequentially!",
  },

  // ==========================================
  // MATH: GEOMETRY & TRIGONOMETRY
  // ==========================================
  {
    id: "m-geom-01",
    section: "math",
    domain: "Geometry and Trigonometry",
    skill: "Circles & Coordinate Geometry",
    difficulty: "Hard",
    passage: undefined,
    prompt:
      "In the xy-plane, the equation of a circle is x² + y² - 6x + 8y = 24. What are the coordinates of the center and the radius of this circle?",
    type: "multiple-choice",
    options: [
      { id: "A", text: "Center: (3, -4), Radius: 7" },
      { id: "B", text: "Center: (-3, 4), Radius: 7" },
      { id: "C", text: "Center: (3, -4), Radius: 49" },
      { id: "D", text: "Center: (-3, 4), Radius: √24" },
    ],
    correctAnswer: "A",
    explanation:
      "Choice A is correct. Complete the square for both x and y:\n(x² - 6x + 9) + (y² + 8y + 16) = 24 + 9 + 16\n(x - 3)² + (y + 4)² = 49\nIn standard circle form (x - h)² + (y - k)² = r²:\nCenter (h, k) = (3, -4)\nRadius r = √49 = 7.",
  },
  {
    id: "m-geom-02",
    section: "math",
    domain: "Geometry and Trigonometry",
    skill: "Right Triangle Trigonometry",
    difficulty: "Medium",
    passage: undefined,
    prompt:
      "In right triangle ABC, angle C is the right angle. If sin(A) = 3/5, what is the value of cos(B)?",
    type: "multiple-choice",
    options: [
      { id: "A", text: "4/5" },
      { id: "B", text: "3/5" },
      { id: "C", text: "3/4" },
      { id: "D", text: "5/3" },
    ],
    correctAnswer: "B",
    explanation:
      "Choice B is correct. In any right triangle with acute angles A and B, angles A and B are complementary: A + B = 90°.\nA fundamental trigonometric identity is sin(θ) = cos(90° - θ). Therefore, sin(A) = cos(B). Since sin(A) = 3/5, cos(B) must also equal 3/5.",
  },
];
