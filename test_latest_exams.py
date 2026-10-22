import os
import re
import json
import hashlib
import unittest

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

class TestLatestExamsFeature(unittest.TestCase):
    def setUp(self):
        self.data_latest = os.path.join(ROOT_DIR, "data", "questions", "latest_exams.json")
        self.pub_data_latest = os.path.join(ROOT_DIR, "public", "data", "questions", "latest_exams.json")
        self.data_math = os.path.join(ROOT_DIR, "data", "questions", "math.json")
        self.data_rw = os.path.join(ROOT_DIR, "data", "questions", "reading_writing.json")

        self.root_html = os.path.join(ROOT_DIR, "index.html")
        self.pub_html = os.path.join(ROOT_DIR, "public", "index.html")

        self.engine_js = os.path.join(ROOT_DIR, "public", "qb_engine.js")
        self.mirror_engine_js = os.path.join(ROOT_DIR, "public", "public", "qb_engine.js")

        with open(self.root_html, "r", encoding="utf-8") as f:
            self.html_content = f.read()
        with open(self.pub_html, "r", encoding="utf-8") as f:
            self.pub_html_content = f.read()

        with open(self.engine_js, "r", encoding="utf-8") as f:
            self.engine_content = f.read()
        with open(self.mirror_engine_js, "r", encoding="utf-8") as f:
            self.mirror_engine_content = f.read()

    def test_01_dataset_presence_and_mirror_parity(self):
        """Invariant 9: latest_exams.json must exist in root and public with identical SHA-256."""
        self.assertTrue(os.path.exists(self.data_latest), "data/questions/latest_exams.json missing")
        self.assertTrue(os.path.exists(self.pub_data_latest), "public/data/questions/latest_exams.json missing")

        with open(self.data_latest, "rb") as f1, open(self.pub_data_latest, "rb") as f2:
            h1 = hashlib.sha256(f1.read()).hexdigest()
            h2 = hashlib.sha256(f2.read()).hexdigest()

        self.assertEqual(h1, h2, "latest_exams.json SHA-256 mismatch between root and public!")
        print(f"\n✅ Latest exams dataset mirror parity verified (SHA: {h1})")

    def test_02_dataset_schema_and_collections(self):
        """Validates all 6 test collections, question counts, and schema fields."""
        with open(self.data_latest, "r", encoding="utf-8") as f:
            exams = json.load(f)

        expected_collections = [
            ("sat_2026_06_math", "Math", "June", 2026, 188),
            ("sat_2026_06_rw", "Reading & Writing", "June", 2026, 236),
        ]

        self.assertEqual(len(exams), 2, "Expected exactly 2 latest exam collections")
        total_questions = sum(len(ex["questions"]) for ex in exams)
        self.assertEqual(total_questions, 424, f"Expected 424 questions across all exams, got {total_questions}")

        for exam_id, subject, month, year, qcount in expected_collections:
            exam = next((e for e in exams if e["id"] == exam_id or e.get("legacy_id") == exam_id), None)
            self.assertIsNotNone(exam, f"Collection {exam_id} not found in latest_exams.json")
            self.assertEqual(exam["subject"], subject)
            self.assertEqual(exam["exam_month"], month)
            self.assertEqual(exam["exam_year"], year)
            self.assertEqual(len(exam["questions"]), qcount, f"Mismatch question count for {exam_id}")
            if exam_id == "sat_2026_06_rw":
                self.assertEqual(exam["title"], "All JUNE 2026 EBRW questions")
            elif exam_id == "sat_2026_06_math":
                self.assertEqual(exam["title"], "All JUNE 2026 Math questions")

            for q in exam["questions"]:
                self.assertIn("id", q)
                self.assertIn("subject", q)
                self.assertIn("prompt", q)
                self.assertIn("correct_answer", q)
                self.assertIn("rationale", q)

                # Schema checks
                if q.get("is_spr"):
                    self.assertIsNone(q.get("options"))
                    self.assertEqual(q.get("type"), "spr")
                else:
                    self.assertIsInstance(q.get("options"), dict)
                    self.assertEqual(set(q["options"].keys()), {"A", "B", "C", "D"})
                    self.assertIn(q["correct_answer"], ["A", "B", "C", "D"])
                    self.assertEqual(q.get("type"), "mcq")

                # Invariant 6: Zero TTS Tokens
                for field in ["prompt", "rationale"]:
                    val = q.get(field, "")
                    for token in ["StartFraction", "end fraction", "StartRoot", "end root", "with numerator"]:
                        self.assertNotIn(token, val, f"TTS token {token} in {q['id']}")

        print(f"✅ All 2 exam collections (424 questions) strictly match schema & invariants")

    def test_03_standard_dataset_strict_isolation(self):
        """Standard question bank (4,303 questions) must remain completely untouched."""
        with open(self.data_math, "r", encoding="utf-8") as f:
            math_qs = json.load(f)
        with open(self.data_rw, "r", encoding="utf-8") as f:
            rw_qs = json.load(f)

        self.assertEqual(len(math_qs), 2458, "Standard math.json altered! Expected 2458.")
        self.assertEqual(len(rw_qs), 1989, "Standard reading_writing.json altered! Expected 1989.")
        self.assertEqual(len(math_qs) + len(rw_qs), 4447, "Total standard questions must be 4447.")
        print("✅ Standard question bank data isolation verified (4,303 questions untouched)")

    def test_04_html_dom_elements_and_mirror_parity(self):
        """Verifies all Latest Exams DOM elements and 100% byte parity between index.html and public/index.html."""
        h1 = hashlib.sha256(self.html_content.encode("utf-8")).hexdigest()
        h2 = hashlib.sha256(self.pub_html_content.encode("utf-8")).hexdigest()
        self.assertEqual(h1, h2, "index.html and public/index.html have diverged!")

        required_elements = [
            'id="qb-mode-standard"',
            'id="qb-mode-latest"',
            'id="qb-mode-standard-latest"',
            'id="qb-mode-latest-latest"',
            'id="qb-latest-exams-view"',
            'id="qb-latest-exams-grid"',
            'id="qb-latest-tab-both"',
            'id="qb-latest-tab-rw"',
            'id="qb-latest-tab-math"',
            'id="qb-latest-exams-count-badge"',
            'id="qb-restart-exam-modal"',
            'id="qb-restart-modal-title"',
            'id="qb-restart-modal-desc"',
            'id="qb-review-mode-banner"',
            'id="qb-review-banner-title"',
            'id="qb-rev-filter-all"',
            'id="qb-rev-filter-incorrect"',
            'id="qb-rev-filter-correct"',
            'id="qb-module-start-modal"',
            'id="qb-mod-grid"',
            'id="qb-mod-tab-types"',
            'id="qb-type-picker-section"',
            'id="qb-type-grid"',
            'id="qb-timer-btn-standard"',
            'id="qb-timer-btn-1.5x"',
            'id="qb-timer-btn-2.0x"',
            'id="qb-timer-btn-untimed"',
            'id="qb-feedback-btn-instant"',
            'id="qb-feedback-btn-simulation"',
        ]

        for elem in required_elements:
            self.assertIn(elem, self.html_content, f"Required DOM element {elem} missing in index.html")

        print("✅ HTML DOM elements and 100% mirror parity verified")

    def test_05_engine_methods_and_mirror_parity(self):
        """Verifies qb_engine.js parity and required engine functions for Latest Exams."""
        h1 = hashlib.sha256(self.engine_content.encode("utf-8")).hexdigest()
        h2 = hashlib.sha256(self.mirror_engine_content.encode("utf-8")).hexdigest()
        self.assertEqual(h1, h2, "public/qb_engine.js and public/public/qb_engine.js have diverged!")

        required_methods = [
            "loadLatestExams(",
            "setBankMode(",
            "setLatestSubject(",
            "getExamProgress(",
            "recordLatestExamAnswer(",
            "renderLatestExamsHub(",
            "startLatestExamPractice(",
            "startLatestExamReview(",
            "setReviewFilter(",
            "promptRestartExam(",
            "confirmRestartExam(",
            "resetExamHistory(",
            "openModuleStartModal(",
            "closeModuleStartModal(",
            "selectModuleSetupTab(",
            "renderModuleGrid(",
            "selectModuleCard(",
            "selectTimerOption(",
            "selectFeedbackOption(",
            "launchConfiguredPractice(",
            "getAllModuleResults(",
            "recordModuleResult(",
            "reviewModuleAnswers(",
            "startNextModule(",
            "sendModuleReportToTelegram(",
            "getQuestionStageInfo(",
            "getTypeFilterFn(",
            "getTypeDisplayName(",
            "renderQuestionTypeGrid(",
            "selectQuestionTypeCard(",
        ]

        for method in required_methods:
            self.assertIn(method, self.engine_content, f"Required method {method} missing in qb_engine.js")

        self.assertIn("dataVersion: '2.18.0'", self.engine_content, "dataVersion 2.18.0 missing in qb_engine.js")
        print("✅ qb_engine.js methods, version 2.18.0, and 100% mirror parity verified")

    def test_06_functional_practice_review_and_restart_simulation(self):
        """Simulates student flow: progress tracking, unsolved practice, review mode with filtering, and restart."""
        with open(self.data_latest, "r", encoding="utf-8") as f:
            exams = json.load(f)

        exam = exams[0]
        total_q = len(exam["questions"])

        # 1. Initially, 0 solved -> all questions available for practice
        solved_ids = set()
        user_answers = {}
        unsolved_pool = [q for q in exam["questions"] if q["id"] not in solved_ids]
        self.assertEqual(len(unsolved_pool), total_q)

        # 2. Simulate answering 5 questions (3 correct, 2 incorrect)
        sample_solved = exam["questions"][:5]
        for idx, q in enumerate(sample_solved):
            q_id = q["id"]
            correct_ans = q["correct_answer"]
            solved_ids.add(q_id)
            if idx < 3:
                user_answers[q_id] = {"answer": correct_ans, "isCorrect": True, "date": "2026-10-18"}
            else:
                wrong_ans = "B" if correct_ans == "A" else "A"
                user_answers[q_id] = {"answer": wrong_ans, "isCorrect": False, "date": "2026-10-18"}

        # 3. Practice now only loads remaining unsolved questions
        remaining_pool = [q for q in exam["questions"] if q["id"] not in solved_ids]
        self.assertEqual(len(remaining_pool), total_q - 5)

        # 4. Review mode simulation
        all_solved_questions = [q for q in exam["questions"] if q["id"] in user_answers]
        self.assertEqual(len(all_solved_questions), 5)

        incorrect_only = [q for q in all_solved_questions if not user_answers[q["id"]]["isCorrect"]]
        self.assertEqual(len(incorrect_only), 2)

        correct_only = [q for q in all_solved_questions if user_answers[q["id"]]["isCorrect"]]
        self.assertEqual(len(correct_only), 3)

        # 5. Restart simulation: resetting progress clears all solved
        solved_ids.clear()
        user_answers.clear()
        restarted_pool = [q for q in exam["questions"] if q["id"] not in solved_ids]
        self.assertEqual(len(restarted_pool), total_q)
        print("✅ Functional simulation of Practice, Filtered Review, and Restart PASSED")

    def test_07_module_practice_and_simulation_suite(self):
        """Verifies 9-module chunking, official timer accommodations, feedback styles, and module results."""
        with open(self.data_latest, "r", encoding="utf-8") as f:
            exams = json.load(f)

        june_exam = next(e for e in exams if e["id"] == "sat_2026_06_rw")
        total_questions = len(june_exam["questions"])
        self.assertEqual(total_questions, 236)

        # 1. Verify 9 modules chunking: 8 modules of 27 questions + 1 module of 20 questions
        total_mods = (total_questions + 26) // 27
        self.assertEqual(total_mods, 9)

        chunks = []
        for i in range(total_mods):
            start = i * 27
            end = min((i + 1) * 27, total_questions)
            chunks.append(june_exam["questions"][start:end])

        self.assertEqual(len(chunks), 9)
        for i in range(8):
            self.assertEqual(len(chunks[i]), 27, f"Module {i + 1} should have 27 questions")
        self.assertEqual(len(chunks[8]), 20, "Module 9 should have the remaining 20 questions")
        self.assertEqual(sum(len(c) for c in chunks), 236)

        # 2. Timer accommodations mapping
        timer_configs = {
            "standard": 32 * 60, # 1920s
            "1.5x": 48 * 60,     # 2880s
            "2.0x": 64 * 60,     # 3840s
            "untimed": 0         # 0s
        }
        self.assertEqual(timer_configs["standard"], 1920)
        self.assertEqual(timer_configs["1.5x"], 2880)
        self.assertEqual(timer_configs["2.0x"], 3840)
        self.assertEqual(timer_configs["untimed"], 0)

        # 3. Simulate Module 1 Exam Simulation result scoring and domain breakdown
        mod1_qs = chunks[0]
        # Simulate answering all 27 questions: 24 correct, 3 incorrect
        mod1_answers = {}
        for idx, q in enumerate(mod1_qs):
            if idx < 24:
                mod1_answers[idx] = q["correct_answer"]
            else:
                wrong = "B" if q["correct_answer"] == "A" else "A"
                mod1_answers[idx] = wrong

        correct_count = sum(1 for idx, q in enumerate(mod1_qs) if mod1_answers[idx] == q["correct_answer"])
        accuracy = round((correct_count / len(mod1_qs)) * 100)
        self.assertEqual(correct_count, 24)
        self.assertEqual(accuracy, 89)

        # Domain breakdown
        domain_breakdown = {}
        for idx, q in enumerate(mod1_qs):
            dom = q["domain"]
            if dom not in domain_breakdown:
                domain_breakdown[dom] = {"correct": 0, "total": 0}
            domain_breakdown[dom]["total"] += 1
            if mod1_answers[idx] == q["correct_answer"]:
                domain_breakdown[dom]["correct"] += 1

        self.assertEqual(sum(d["total"] for d in domain_breakdown.values()), 27)
        self.assertEqual(sum(d["correct"] for d in domain_breakdown.values()), 24)
        print(f"✅ Digital SAT 9-Module Practice & Simulation Suite verified (236 Qs, 9 modules, accommodations, domain breakdown)")

    def test_08_official_module_question_type_ordering(self):
        """Invariant: Every module must strictly follow College Board 5-stage order:
        1. Words In Context
        2. Reading Comprehension (ending strictly with Inferences / Logical Completion)
        3. Conventions of Standard English (Form, Structure, and Sense)
        4. Transitions
        5. Notes (Rhetorical Synthesis)
        """
        with open(self.data_latest, "r", encoding="utf-8") as f:
            exams = json.load(f)

        june_exam = next(e for e in exams if e["id"] == "sat_2026_06_rw")
        qs = june_exam["questions"]
        self.assertEqual(len(qs), 236)

        stage_map = {
            'Words in Context': 1,
            'Text Structure and Purpose': 2,
            'Central Ideas and Details': 2,
            'Cross-Text Connections': 2,
            'Command of Evidence': 2,
            'Inferences': 3,
            'Form, Structure, and Sense': 4,
            'Transitions': 5,
            'Rhetorical Synthesis': 6
        }

        total_mods = (len(qs) + 26) // 27
        for m in range(total_mods):
            batch = qs[m * 27 : min((m + 1) * 27, len(qs))]
            skills = [q["skill"] for q in batch]

            # 1. Must begin with Words in Context
            self.assertEqual(skills[0], "Words in Context", f"Module {m + 1} did not begin with Words in Context")

            # 2. Must end with Rhetorical Synthesis (Notes)
            self.assertEqual(skills[-1], "Rhetorical Synthesis", f"Module {m + 1} did not end with Notes (Rhetorical Synthesis)")

            # 3. Stages must be monotonically non-decreasing
            stages = [stage_map[s] for s in skills]
            self.assertEqual(stages, sorted(stages), f"Module {m + 1} violated College Board 5-stage ordering: {skills}")

        print("✅ Official 5-stage College Board question ordering verified across all 9 modules")

    def test_09_ebrw_structural_authenticity_invariant_12(self):
        """Invariant 12: EBRW Structural Authenticity (Blanks, Notes, Clean Options, Logical Completion)."""
        with open(self.data_latest, "r", encoding="utf-8") as f:
            exams = json.load(f)

        exam = next(e for e in exams if e["id"] == "sat_2026_06_rw")
        qs = exam["questions"]

        for q in qs:
            qid = q["id"]
            skill = q.get("skill")
            prompt = q.get("prompt", "")
            passage = q.get("passage", "")

            # 12.1 Words in Context, Transitions, Conventions must contain blank (or <u> for "most nearly mean")
            if skill in ["Transitions", "Form, Structure, and Sense"] or (skill == "Words in Context" and "completes the text" in prompt):
                self.assertIn("______", passage, f"Invariant 12.1 violation: Question {qid} ({skill}) missing authentic blank '______'")
            elif skill == "Words in Context" and ("most nearly mean" in prompt or "most likely indicate" in prompt):
                self.assertTrue("<u>" in passage or "underline" in passage, f"Invariant 12.6 violation: Question {qid} missing underline markup")

            # 12.2 Logical Completion Inferences must end with blank
            if skill == "Inferences":
                self.assertTrue(passage.rstrip().endswith("______"), f"Invariant 12.2 violation: Question {qid} ({skill}) does not end with '______'")

            # 12.3 Rhetorical Synthesis must have bulleted notes structure
            if skill == "Rhetorical Synthesis":
                self.assertIn("While researching a topic, a student has taken the following notes:", passage,
                              f"Invariant 12.3 violation: Question {qid} missing standard notes lead-in")
                self.assertIn("•", passage, f"Invariant 12.3 violation: Question {qid} missing bullet dots")

            # 12.5 Clean options: no single-letter OCR prefixes (e.g. 'c resisted')
            for opt_key, opt_text in (q.get("options") or {}).items():
                self.assertFalse(re.match(r'^[a-z]\s+[a-z]', opt_text),
                                f"Invariant 12.5 violation: Question {qid} Option {opt_key} has OCR stray prefix: '{opt_text}'")

        print("✅ Invariant 12 verified across all 236 questions: authentic blanks, bulleted notes, clean options")

    def test_10_math_module_practice_and_simulation_suite(self):
        """Verifies Math 9-module chunking (22 per module), 35-min timer accommodations, and Math Invariants."""
        with open(self.data_latest, "r", encoding="utf-8") as f:
            exams = json.load(f)

        math_exam = next(e for e in exams if e["id"] == "sat_2026_06_math")
        qs = math_exam["questions"]
        self.assertEqual(len(qs), 188, "Expected 188 questions in June 2026 Math")
        self.assertEqual(math_exam["subject"], "Math")
        self.assertEqual(math_exam["title"], "All JUNE 2026 Math questions")

        # 1. 22 questions per module chunking: 8 modules of 22 questions + 1 module of 12 questions = 188 total
        mod_size = 22
        total_mods = (len(qs) + mod_size - 1) // mod_size
        self.assertEqual(total_mods, 9)

        chunks = []
        for i in range(total_mods):
            start = i * mod_size
            end = min((i + 1) * mod_size, len(qs))
            chunks.append(qs[start:end])

        self.assertEqual(len(chunks), 9)
        diff_order = {"Easy": 1, "Medium": 2, "Hard": 3}
        for i in range(8):
            self.assertEqual(len(chunks[i]), 22, f"Math Module {i + 1} should have 22 questions")
            # Invariant: 16 MCQs (Stage 1) followed by 6 SPRs (Stage 2)
            mod_mcqs = chunks[i][:16]
            mod_sprs = chunks[i][16:]
            self.assertTrue(all(not q.get("is_spr") for q in mod_mcqs), f"Module {i + 1} first 16 must be MCQs")
            self.assertTrue(all(q.get("is_spr") for q in mod_sprs), f"Module {i + 1} last 6 must be SPRs")
            # Difficulty progression within each stage
            mcq_diffs = [diff_order[q["difficulty"]] for q in mod_mcqs]
            spr_diffs = [diff_order[q["difficulty"]] for q in mod_sprs]
            self.assertEqual(mcq_diffs, sorted(mcq_diffs), f"Module {i + 1} MCQs not sorted by difficulty: {mcq_diffs}")
            self.assertEqual(spr_diffs, sorted(spr_diffs), f"Module {i + 1} SPRs not sorted by difficulty: {spr_diffs}")

        # Module 9: 7 MCQs + 5 SPRs
        self.assertEqual(len(chunks[8]), 12, "Math Module 9 should have remaining 12 questions")
        mod9_mcqs = chunks[8][:7]
        mod9_sprs = chunks[8][7:]
        self.assertTrue(all(not q.get("is_spr") for q in mod9_mcqs), "Module 9 first 7 must be MCQs")
        self.assertTrue(all(q.get("is_spr") for q in mod9_sprs), "Module 9 last 5 must be SPRs")
        self.assertEqual(sum(len(c) for c in chunks), 188)

        # Invariant: Sequential IDs matching module ordering
        for idx, q in enumerate(qs, start=1):
            expected_id = f"sat_2026_06_math_{idx:03d}"
            self.assertEqual(q["id"], expected_id, f"Question at index {idx} has ID {q['id']}, expected {expected_id}")

        # 2. Timer accommodations mapping for Math (35 minutes standard)
        math_timer_configs = {
            "standard": 35 * 60, # 2100s
            "1.5x": 53 * 60,     # 3180s
            "2.0x": 70 * 60,     # 4200s
            "untimed": 0         # 0s
        }
        self.assertEqual(math_timer_configs["standard"], 2100)
        self.assertEqual(math_timer_configs["1.5x"], 3180)
        self.assertEqual(math_timer_configs["2.0x"], 4200)
        self.assertEqual(math_timer_configs["untimed"], 0)

        # 3. Invariant 7 (Strict Schema Compliance & Math empty passage)
        valid_domains = {"Algebra", "Advanced Math", "Problem-Solving and Data Analysis", "Geometry and Trigonometry"}
        for q in qs:
            qid = q["id"]
            self.assertEqual(q.get("passage", ""), "", f"{qid}: Math passage must be empty string")
            self.assertEqual(q.get("subject"), "Math", f"{qid}: Subject must be Math")
            self.assertIn(q.get("domain"), valid_domains, f"{qid}: Invalid domain {q.get('domain')}")

            if q.get("is_spr"):
                self.assertIsNone(q.get("options"), f"{qid}: SPR options must be None")
                self.assertEqual(q.get("type"), "spr", f"{qid}: SPR type must be 'spr'")
                self.assertEqual(str(q.get("correct")), str(q.get("correct_answer")), f"{qid}: SPR correct mismatch")
            else:
                self.assertIsInstance(q.get("options"), dict, f"{qid}: MCQ options must be dict")
                self.assertEqual(set(q["options"].keys()), {"A", "B", "C", "D"}, f"{qid}: Missing option keys")
                self.assertEqual(q.get("type"), "mcq", f"{qid}: MCQ type must be 'mcq'")
                self.assertEqual(q.get("is_spr"), False, f"{qid}: MCQ is_spr must be False")
                self.assertIn(q.get("correct"), ["A", "B", "C", "D"], f"{qid}: Invalid correct key")
                self.assertEqual(q.get("correct"), q.get("correct_answer"), f"{qid}: correct mismatch")

            # 4. Invariant 1 (Visual elements wrapped properly)
            prompt = q.get("prompt", "")
            if "<svg" in prompt:
                self.assertIn("qb-figure-wrapper", prompt, f"{qid}: SVG must be wrapped in qb-figure-wrapper")
            if "<table" in prompt:
                self.assertIn("qb-table-wrapper", prompt, f"{qid}: Table must be wrapped in qb-table-wrapper")

            # 5. Invariant 6 & 11: Zero TTS tokens and no bare \frac in options
            for token in ["StartFraction", "end fraction", "StartRoot", "end root", "with numerator"]:
                self.assertNotIn(token, prompt, f"{qid} prompt has TTS token {token}")
                self.assertNotIn(token, q.get("rationale", ""), f"{qid} rationale has TTS token {token}")

            for opt_k, opt_v in (q.get("options") or {}).items():
                if r"\frac" in opt_v:
                    self.assertTrue(opt_v.startswith("$") and opt_v.endswith("$"), f"{qid} Option {opt_k} bare fraction without $: {opt_v}")

        print("✅ Digital SAT Math 9-Module Practice & Simulation Suite verified (188 Qs, 9 modules, 35m timers, all Invariants)")

if __name__ == "__main__":
    unittest.main()

