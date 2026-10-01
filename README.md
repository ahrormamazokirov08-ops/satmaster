# 🎓 SATMaster — Digital SAT Homework & Auto-Grading Suite for Educators

A modern web platform engineered specifically for **SAT teachers, tutors, and test-prep centers** to create, assign, and auto-grade Digital SAT homework effortlessly.

---

## 🌟 Why SATMaster?

As an SAT teacher, grading homework manually—especially matching student answers across multiple-choice questions, passage analysis, and Student-Produced Response (SPR) math grid-ins—wastes hours every week.

**SATMaster solves this by providing:**
1. **Curated Digital SAT Question Bank**: Pre-loaded with authentic questions covering both **Reading & Writing** (*Craft & Structure, Information & Ideas, Standard English Conventions, Expression of Ideas*) and **Math** (*Algebra, Advanced Math quadratics, Problem-Solving & Data Analysis, Geometry & Trigonometry*).
2. **Frictionless Student Sharing**: Students need **zero account creation or passwords**. Send a shareable link (`/hw/[id]`) or a 6-character PIN code (`MATH-01`) on WhatsApp, Telegram, or Google Classroom. Students simply enter their name and submit.
3. **100% Instant Auto-Grading**: Grades multiple choice and intelligently handles mathematical equivalence (e.g., both `2.5` and `5/2` or `0.75` and `3/4` are recognized as correct).
4. **Class Trouble Spots & Error Heatmaps**: Visual diagnostics pinpoint which questions caused the most errors across your class and show the exact trap choices students fell for, allowing you to prepare the perfect review session.
5. **Instant Feedback with Step-by-Step Explanations**: Students see their grade and full explanations immediately upon submitting so they learn from mistakes while the material is fresh.
6. **Teacher Feedback Notes**: Inspect any student's answer sheet question-by-question and attach personalized feedback notes.

---

## 🚀 Quick Start (Running Locally)

1. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. Open your browser:
   - **Teacher Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
   - **Assignments & Gradebook**: [http://localhost:3000/dashboard/assignments](http://localhost:3000/dashboard/assignments)
   - **Create New Homework**: [http://localhost:3000/dashboard/assignments/new](http://localhost:3000/dashboard/assignments/new)
   - **SAT Question Bank**: [http://localhost:3000/dashboard/bank](http://localhost:3000/dashboard/bank)
   - **Student Homework Portal**: [http://localhost:3000/hw](http://localhost:3000/hw)

---

## 📋 Key Workflows

### 1. Creating Homework
1. Go to **Create Homework** (`/dashboard/assignments/new`).
2. Enter an assignment title (e.g., *"Week 3: SAT Math Quadratics & Reading Conventions"*).
3. Choose your questions:
   - **From SAT Question Bank**: Filter by Math or Reading & Writing, filter by Domain, and select with 1 click.
   - **Write Custom Question**: Add your own passage, prompt, choices, correct answer, and explanation.
4. Set optional timer (e.g. 20 minutes) and click **Publish**.
5. Copy the generated student link or class PIN code.

### 2. Student Submissions
1. Student opens the link or visits `/hw` and types the PIN.
2. Enters their name (e.g., "Alex Chen").
3. Solves questions in the Bluebook-style interface:
   - Split-screen passage view for Reading & Writing.
   - Strike-through elimination tool for crossing out wrong choices.
   - Flag questions for review.
4. Clicks **Review & Submit** to see instant score and step-by-step solutions.

### 3. Checking Results & Error Analytics
1. Go to **Assignments & Grading** and open the assignment gradebook.
2. Review:
   - **Class Average & Score Distribution**.
   - **Trouble Spots Heatmap**: High-error questions highlighted in amber with the most common wrong answers.
   - **Student Submissions Table**: Inspect individual student answer sheets and add personalized feedback.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **UI & Styling**: Tailwind CSS, Radix UI Primitives, Lucide Icons
- **Theme**: Dark Slate Modern UI
- **Storage**: Client persistence with localStorage and pre-seeded realistic student data for instant out-of-the-box exploration.
