# NFA → DFA Converter

<div align="center">

![NFA to DFA](https://img.shields.io/badge/Automata-NFA%20→%20DFA-5dffaa?style=for-the-badge&logoColor=black)
![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-ffb85c?style=for-the-badge&logo=javascript&logoColor=black)
![No Dependencies](https://img.shields.io/badge/Dependencies-Zero-5cb8ff?style=for-the-badge)
![Single Page](https://img.shields.io/badge/Type-Single%20Page%20App-ff5c8a?style=for-the-badge)

**An interactive, visual NFA to DFA converter using the Subset Construction algorithm.**  
Built as a course project for Theory of Automata and Formal Languages.

[▶ Live Demo (https://himanshuchoudharyug24-glitch.github.io/NFA-DFA-VISUALIZER/)](#) · [📖 Report Bug](../../issues) · [✨ Request Feature](../../issues)

</div>

---

## 📸 Preview

> The tool opens with a default NFA pre-loaded and converts it automatically on load.

| NFA Graph | DFA Graph | Step-by-Step |
|-----------|-----------|--------------|
| Blue nodes, blue edges | Green nodes, green edges | Highlighted active row + node |

---

## ✨ Features

- **Live SVG graph rendering** — both NFA and DFA drawn as vector graphs with glowing nodes, curved bidirectional edges, and self-loops
- **Subset Construction algorithm** — full implementation including ε-closure and move functions
- **Step-by-step mode** — watch the DFA being built one state at a time with the current state highlighted on the graph
- **Animated playback** — auto-play through all steps with a variable speed slider (5 speeds)
- **String Tester** — type any string and simulate it on the DFA with an animated input tape and δ-trace
- **ε-NFA support** — handles epsilon transitions correctly with proper ε-closure computation
- **7 built-in presets** — ends-with-ab, ε-NFA, binary÷3, a\*∪b\*, aabb\*, mod-3, all-0s
- **Keyboard shortcuts** — `Enter` convert, `←/→` step, `Space` play/pause, `R` reset
- **Export** — download NFA or DFA as SVG, copy DFA transition table to clipboard
- **Algorithm modal** — inline explanation of the Subset Construction algorithm
- **Conversion Summary** — stat cards showing NFA states, DFA states, accept states, steps, and state ratio
- **Responsive layout** — single-column on mobile, two-column on desktop
- **Zero dependencies** — pure vanilla HTML + CSS + JS, works fully offline

---

## 🚀 Getting Started

### Option 1 — Open directly (no server needed)

```bash
git clone https://github.com/your-username/nfa-dfa-converter.git
cd nfa-dfa-converter
# Just open index.html in any browser
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

### Option 2 — Serve locally

```bash
# Python
python3 -m http.server 8080

# Node.js
npx serve .

# Then open http://localhost:8080
```

---

## 📁 Project Structure

```
nfa-dfa-converter/
├── index.html      # HTML structure and modal markup
├── style.css       # All styling — CSS variables, layout, components
├── script.js       # All logic — parser, algorithm, graph engine, UI
└── README.md       # This file
```

### File responsibilities

| File | Responsibility |
|------|---------------|
| `index.html` | DOM structure, modal, panels, tabs, footer |
| `style.css` | Design tokens (CSS variables), layout grid, all component styles, animations |
| `script.js` | NFA parser, ε-closure, move, subset construction, SVG graph engine, string tester, export |

---

## 🎮 How to Use

### Basic conversion

1. Enter states, alphabet, start state, and accept states in the left panel
2. Enter transitions one per line in the format `state,symbol → dest1 dest2`
3. Click **⚡ CONVERT NFA → DFA** (or press `Enter`)
4. The NFA and DFA graphs appear on the right; tables appear below

### Transition format

```
q0,a → q0 q1       # q0 on 'a' goes to both q0 and q1 (nondeterminism)
q0,b → q0           # q0 on 'b' goes to q0
q1,b → q2           # q1 on 'b' goes to q2
q0,ε → q1           # epsilon transition (use ε or eps)
```

### Step mode

1. Click **▶ Step Mode** to build the DFA one step at a time
2. Use `←` / `→` arrow keys (or the Prev/Next buttons) to navigate
3. Press `Space` to auto-play; drag the **Speed** slider to control pace
4. The current DFA state being processed is highlighted on the graph
5. Click **⏭ All** to jump to the final result

### String Tester

1. After conversion, type a string in the **String Tester** panel
2. The animated input tape shows each character being consumed
3. The δ-trace shows each state transition
4. The final state is highlighted on the DFA graph
5. Leave empty to test the empty string (ε)

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Convert NFA → DFA |
| `←` | Previous step (step mode) |
| `→` | Next step (step mode) |
| `Space` | Play / Pause (step mode) |
| `R` | Reset everything |
| `Esc` | Close algorithm modal |

---

## 🧮 Algorithm

The tool implements the **Subset Construction** (also called **Powerset Construction**) algorithm:

```
1. INIT
   Start state of DFA = ε-closure({NFA start state})
   Add to work queue

2. EXPAND (repeat until queue empty)
   For each DFA state S in queue:
     For each symbol σ in alphabet:
       target = ε-closure(move(S, σ))
       Record δ(S, σ) = target
       If target is new → add to queue

3. ACCEPT STATES
   A DFA state is accepting ⟺ it contains any NFA accepting state

4. DEAD STATE
   {} (empty set) = trap state — all undefined transitions lead here
```

**Time complexity:** O(2^n) states in the worst case, where n = number of NFA states.  
**Space complexity:** O(2^n) for the DFA state table.

---

## 🎨 Design

The UI uses a **terminal noir × bioluminescent** aesthetic:

| Token | Value | Use |
|-------|-------|-----|
| `--g` | `#5dffaa` | Primary accent — DFA, success |
| `--g2` | `#ff5c8a` | Error, accept states, reject |
| `--g3` | `#5cb8ff` | NFA, info, blue accent |
| `--g4` | `#ffb85c` | Amber — warnings, ε info |
| `--g5` | `#c05cff` | Violet — string tester |
| `--bg` | `#07070d` | Near-black background |

Fonts: **Syne** (display/headings) + **Space Mono** (monospace/code)

---

## 🔧 Technical Notes

- The **graph engine is pure SVG** — no canvas, no external libraries
- Edge keys use `from__to` format; `parts.slice(1).join('__')` handles state names containing `__`
- Bidirectional edges are automatically curved using a perpendicular offset
- The `ε-closure` uses iterative BFS (stack-based) to avoid recursion limits
- All state labels are sorted sets: `{q0,q2}` not `{q2,q0}` — consistent identity
- The dead state `{}` is rendered with a dimmed style to distinguish it visually

---

## 📚 Course Information

| Field | Value |
|-------|-------|
| **Student** | Himanshu Choudhary |
| **Roll No** | 2024UCS1604 |
| **Subject** | Theory of Automata and Formal Languages |
| **Topic** | NFA to DFA Conversion using Subset Construction |

---

## 📄 License

This project is submitted as academic coursework.  
Feel free to reference or learn from the code with attribution.

---

<div align="center">

Made with ♥ by **Himanshu Choudhary**

*"Every NFA has an equivalent DFA — this is how we prove it."*

</div>

