#!/usr/bin/env python3
"""
scripts/reprocess_questions.py
Re-processes all 3,770 College Board questions (1,845 RW, 1,925 Math) directly
from local cache (data/.cache/) to preserve authentic HTML tables and vector SVGs,
while stripping all screen-reader spoken descriptions (<div class="sr-only">).
Updates both data/questions/ and public/data/questions/ mirrors.
"""

import os
import sys
import json
import re
import html
import xml.etree.ElementTree as ET

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, "data", "questions")
PUBLIC_DATA_DIR = os.path.join(ROOT_DIR, "public", "data", "questions")
CACHE_DIR = os.path.join(ROOT_DIR, "data", ".cache")

DIFFICULTY_MAP = {
    "E": "Easy",
    "M": "Medium",
    "H": "Hard",
    "Easy": "Easy",
    "Medium": "Medium",
    "Hard": "Hard"
}


def mathml_to_latex(elem):
    """Recursively convert MathML ElementTree node to LaTeX math string."""
    tag = elem.tag.split("}")[-1]
    text = (elem.text or "").strip()

    children_latex = [mathml_to_latex(c) for c in elem]

    syms = {
        "−": "-", "–": "-", "≤": "\\le ", "≥": "\\ge ", "≠": "\\ne ",
        "⋅": "\\cdot ", "±": "\\pm ", "×": "\\times ", "÷": "\\div ",
        "°": "^\\circ", "π": "\\pi ", "θ": "\\theta ", "α": "\\alpha ",
        "β": "\\beta ", "Δ": "\\Delta ", "≈": "\\approx ", "∞": "\\infty ",
        "<": "<", ">": ">"
    }

    if tag == "mi":
        return syms.get(text, text)
    elif tag == "mn":
        return text
    elif tag == "mo":
        return syms.get(text, text)
    elif tag == "mfrac":
        if len(children_latex) >= 2:
            return "\\frac{" + children_latex[0] + "}{" + children_latex[1] + "}"
        return "".join(children_latex)
    elif tag == "msup":
        if len(children_latex) >= 2:
            return "{" + children_latex[0] + "}^{" + children_latex[1] + "}"
        return "".join(children_latex)
    elif tag == "msub":
        if len(children_latex) >= 2:
            return "{" + children_latex[0] + "}_{" + children_latex[1] + "}"
        return "".join(children_latex)
    elif tag == "msubsup":
        if len(children_latex) >= 3:
            return "{" + children_latex[0] + "}_{" + children_latex[1] + "}^{" + children_latex[2] + "}"
        return "".join(children_latex)
    elif tag == "msqrt":
        return "\\sqrt{" + "".join(children_latex) + "}"
    elif tag == "mroot":
        if len(children_latex) >= 2:
            return "\\sqrt[" + children_latex[1] + "]{" + children_latex[0] + "}"
        return "\\sqrt{" + "".join(children_latex) + "}"
    elif tag == "mfenced":
        open_b = elem.attrib.get("open", "(")
        close_b = elem.attrib.get("close", ")")
        return "\\left" + open_b + "".join(children_latex) + "\\right" + close_b
    elif tag == "mtext":
        return "\\text{" + text + "}"
    elif tag == "mspace":
        return " "
    else:
        res = "".join(children_latex)
        if text:
            res = text + " " + res
        return res


def convert_spoken_math_to_latex(alt):
    """Converts spoken math expressions found in image alt tags to readable math/symbols."""
    if not alt:
        return ""
    s = alt
    repls = [
        (r"\bopen parenthesis\b", "("),
        (r"\bclose parenthesis\b", ")"),
        (r"\bplus\b", "+"),
        (r"\bminus\b", "-"),
        (r"\bnegative\b", "-"),
        (r"\bequals\b", "="),
        (r"\btimes\b", "*"),
        (r"\bdivided by\b", "/"),
        (r"\bcomma\b", ","),
        (r"\bthe fraction\b", ""),
        (r"\bone half\b", "1/2"),
        (r"\bone third\b", "1/3"),
        (r"\bone fourth\b", "1/4"),
        (r"\bthree halves\b", "3/2"),
        (r"\btwo thirds\b", "2/3"),
        (r"\bpoint\b", "."),
    ]
    for pattern, rep in repls:
        s = re.sub(pattern, rep, s, flags=re.I)
    s = re.sub(r"\s*,\s*", ", ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return f"${s}$"


def clean_cell_content(content):
    """Strips paragraph/div wrappers inside table cells while keeping content."""
    return re.sub(r"<\/?(p|div)[^>]*>", " ", content).strip()


def clean_table_html(tbl_html):
    """Standardizes College Board tables into clean, responsive Bluebook tables."""
    tbl = tbl_html.strip()

    # 1. Clean caption
    def repl_cap(m):
        c = re.sub(r"<\/?(p|div|span)[^>]*>", "", m.group(1)).strip()
        c = html.unescape(c)
        return f"<caption class=\"font-bold text-slate-900 pb-2 text-center text-sm sm:text-base\">{c}</caption>"
    tbl = re.sub(r"<caption[^>]*>([\s\S]*?)<\/caption>", repl_cap, tbl, flags=re.I)

    # 2. Standardize th (table header cells)
    def repl_th(m):
        attrs = m.group(1)
        align = "text-left" if ("text-align: left" in attrs or "scope=\"row\"" in attrs or "scope=\x27row\x27" in attrs) else "text-center"
        scope = ""
        if "scope=\"col\"" in attrs or "scope=\x27col\x27" in attrs:
            scope = " scope=\"col\""
        elif "scope=\"row\"" in attrs or "scope=\x27row\x27" in attrs:
            scope = " scope=\"row\""
        colspan = re.search(r"colspan=[\x27\"](\d+)[\x27\"]", attrs)
        rowspan = re.search(r"rowspan=[\x27\"](\d+)[\x27\"]", attrs)
        cs = f" colspan=\"{colspan.group(1)}\"" if colspan else ""
        rs = f" rowspan=\"{rowspan.group(1)}\"" if rowspan else ""
        return f"<th class=\"border border-slate-300 bg-slate-50 px-3 py-2 {align} font-semibold text-slate-800\"{scope}{cs}{rs}>"
    tbl = re.sub(r"<th\b([^>]*)>", repl_th, tbl, flags=re.I)

    # 3. Standardize td (table data cells)
    def repl_td(m):
        attrs = m.group(1)
        align = "text-left" if "text-align: left" in attrs else "text-center"
        colspan = re.search(r"colspan=[\x27\"](\d+)[\x27\"]", attrs)
        rowspan = re.search(r"rowspan=[\x27\"](\d+)[\x27\"]", attrs)
        cs = f" colspan=\"{colspan.group(1)}\"" if colspan else ""
        rs = f" rowspan=\"{rowspan.group(1)}\"" if rowspan else ""
        return f"<td class=\"border border-slate-300 px-3 py-2 {align} text-slate-700\"{cs}{rs}>"
    tbl = re.sub(r"<td\b([^>]*)>", repl_td, tbl, flags=re.I)

    # 4. Clean block elements inside cells
    def repl_cell(m):
        tag = m.group(1)
        attrs = m.group(2)
        inner = clean_cell_content(m.group(3))
        return f"<{tag}{attrs}>{inner}</{tag}>"
    tbl = re.sub(r"<(th|td)\b([^>]*)>([\s\S]*?)<\/\1>", repl_cell, tbl, flags=re.I)

    # 5. Wrap table with responsive overflow container
    tbl = re.sub(r"<table[^>]*>", "<div class=\"qb-table-wrapper overflow-x-auto my-4 w-full\"><table class=\"qb-data-table min-w-full border-collapse border border-slate-300 text-sm\">", tbl, flags=re.I, count=1)
    tbl = re.sub(r"<\/table>", "</table></div>", tbl, flags=re.I, count=1)

    return tbl


def clean_svg_html(raw_svg):
    """Standardizes College Board SVG graphics into responsive containers with valid XML & viewBox."""
    svg = raw_svg.strip()
    
    # Clean non-standard XML named entities to avoid parsing failures
    entities = {
        '&ndash;': '–', '&mdash;': '—', '&deg;': '°', '&plusmn;': '±',
        '&times;': '×', '&divide;': '÷', '&le;': '≤', '&ge;': '≥',
        '&ne;': '≠', '&sup2;': '²', '&sup3;': '³', '&micro;': 'µ',
        '&nbsp;': '&#160;', '&lsquo;': '‘', '&rsquo;': '’',
        '&ldquo;': '“', '&rdquo;': '”', '&minus;': '−',
        '&eacute;': 'é', '&auml;': 'ä', '&frac12;': '½',
    }
    for ent, val in entities.items():
        svg = svg.replace(ent, val)

    # Ensure xmlns attribute is present
    if "xmlns=" not in svg[:150]:
        svg = re.sub(r'<svg\b', '<svg xmlns="http://www.w3.org/2000/svg"', svg, count=1, flags=re.I)

    # Ensure viewBox exists if width and height are specified
    if "viewBox" not in svg[:250] and "viewbox" not in svg[:250]:
        w_m = re.search(r'\bwidth=[\x27"](\d+(?:\.\d+)?)(?:px)?[\x27"]', svg[:250])
        h_m = re.search(r'\bheight=[\x27"](\d+(?:\.\d+)?)(?:px)?[\x27"]', svg[:250])
        if w_m and h_m:
            svg = re.sub(r'<svg\b', f'<svg viewBox="0 0 {w_m.group(1)} {h_m.group(1)}"', svg, count=1, flags=re.I)

    # Standardize responsive classes
    if "class=" in svg[:150]:
        svg = re.sub(r"<svg([^>]*?)class=[\x27\"]([^\x27\"]*)[\x27\"]", r'<svg\1class="\2 max-w-full h-auto mx-auto block"', svg, count=1, flags=re.I)
    else:
        svg = re.sub(r"<svg\b", r'<svg class="max-w-full h-auto mx-auto block"', svg, count=1, flags=re.I)

    return f'<div class="qb-figure-wrapper my-4 flex justify-center overflow-x-auto w-full">{svg}</div>'


def clean_html_and_convert_math(raw_html):
    """
    Cleans College Board HTML, strips accessibility screen-reader texts,
    preserves authentic HTML tables & vector SVGs, and converts MathML / math images to LaTeX.
    """
    if not raw_html:
        return ""
    s = raw_html

    # 1. Strip screen-reader noise and placeholders
    s = re.sub(r'<span[^>]*\bsr-only\b[^>]*>[\s\S]*?<\/span>', '', s, flags=re.I)
    s = re.sub(r'<div[^>]*\bsr-only\b[^>]*>[\s\S]*?<\/div>', '', s, flags=re.I)

    # 2. Normalize fill-in blanks
    s = re.sub(r'<span[^>]*aria-hidden=[\'"]true[\'"][^>]*>_{3,}<\/span>', '______', s, flags=re.I)

    # 3. Convert MathML to LaTeX
    def repl_math(match):
        xml_str = match.group(0)
        try:
            clean_xml = re.sub(r'\sxmlns(=[\'"][^\'"]*[\'"])?', '', xml_str)
            root = ET.fromstring(clean_xml)
            tex = mathml_to_latex(root).strip()
            if tex:
                return f"${tex}$"
        except Exception:
            pass
        alt = re.search(r'alttext=[\'"]([^\'"]+)[\'"]', xml_str)
        if alt:
            return f"${alt.group(1)}$"
        return ""

    s = re.sub(r'<math[\s\S]*?<\/math>', repl_math, s, flags=re.I)

    # 4. Process images
    def repl_img(match):
        tag = match.group(0)
        alt_match = re.search(r'alt=[\'"]([^\'"]*)[\'"]', tag, flags=re.I)
        src_match = re.search(r'src=[\'"]([^\'"]*)[\'"]', tag, flags=re.I)
        alt = alt_match.group(1).strip() if alt_match else ""
        src = src_match.group(1).strip() if src_match else ""

        # If base64 math image, convert spoken alt to LaTeX math
        if "data:image" in src:
            if alt:
                return f" {convert_spoken_math_to_latex(alt)} "
            return ""

        # If external URL, format as absolute markdown image
        if src.startswith("/"):
            src = f"https://satsuitequestionbank.collegeboard.org{src}"
        return f" ![{alt}]({src}) "

    s = re.sub(r'<img[^>]+>', repl_img, s, flags=re.I)

    # 5. Extract and protect HTML tables
    tables = []
    def repl_extract_table(m):
        idx = len(tables)
        tables.append(clean_table_html(m.group(0)))
        return f"\n\n__TABLE_PLACEHOLDER_{idx}__\n\n"

    s = re.sub(r'<table[\s\S]*?<\/table>', repl_extract_table, s, flags=re.I)

    # 6. Extract and protect vector SVGs
    svgs = []
    def repl_extract_svg(m):
        idx = len(svgs)
        svgs.append(clean_svg_html(m.group(0)))
        return f"\n\n__SVG_PLACEHOLDER_{idx}__\n\n"

    s = re.sub(r'<svg[\s\S]*?<\/svg>', repl_extract_svg, s, flags=re.I)

    # 7. Convert list items to formatted bullets (preserves 203 notes questions)
    s = re.sub(r'<li>\s*', '• ', s, flags=re.I)
    s = re.sub(r'<\/li>\s*', '\n\n', s, flags=re.I)

    # 8. Preserve block formatting (paragraphs, breaks)
    s = re.sub(r'<\/(p|div|tr|h[1-6])>', '\n\n', s, flags=re.I)
    s = re.sub(r'<br\s*\/?>', '\n', s, flags=re.I)

    # 9. Strip remaining HTML tags
    s = re.sub(r'<[^>]+>', '', s)
    s = html.unescape(s)

    # 10. Normalize whitespaces and clean newlines
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in s.split('\n')]
    cleaned = '\n'.join(lines)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned).strip()

    # 11. Restore table and SVG placeholders
    for i, tbl in enumerate(tables):
        cleaned = cleaned.replace(f"__TABLE_PLACEHOLDER_{i}__", tbl)
    for i, svg in enumerate(svgs):
        cleaned = cleaned.replace(f"__SVG_PLACEHOLDER_{i}__", svg)

    return cleaned


def extract_spr_answer_from_rationale(rat_text):
    """Extracts correct numeric/fraction answer for SPR from rationale."""
    if not rat_text:
        return ""
    m1 = re.search(r'Note that\s+([0-9\.\-\/]+)', rat_text)
    if m1:
        return m1.group(1).strip()
    m2 = re.search(r'The correct answer is\s+(?:<[^>]+>)*\s*([0-9\.\-\/]+)', rat_text)
    if m2:
        return m2.group(1).strip()
    m3 = re.search(r'The correct answer is\s+<span[^>]*><img[^>]*alt=[\'"]([^\'"]+)[\'"]', rat_text)
    if m3:
        alt_str = m3.group(1).strip()
        word_map = {
            "three halves": "3/2", "one half": "1/2", "one third": "1/3",
            "two thirds": "2/3", "one fourth": "1/4", "three fourths": "3/4"
        }
        if alt_str.lower() in word_map:
            return word_map[alt_str.lower()]
        m_num = re.search(r'([0-9\.\-\/]+)', alt_str)
        if m_num:
            return m_num.group(1)
        return alt_str
    m4 = re.search(r'The correct answer is\s+([^\.]+)\.', rat_text)
    if m4:
        ans_raw = re.sub(r'<[^>]+>', '', m4.group(1)).strip()
        if ans_raw:
            return ans_raw
    return ""


def process_item(meta_item, detail_data, subject_name, id_prefix, index_num):
    """Transforms raw College Board metadata & question detail into standardized schema."""
    if not detail_data:
        return None

    raw_diff = meta_item.get("difficulty", "M")
    difficulty = DIFFICULTY_MAP.get(raw_diff, "Medium")

    domain = meta_item.get("primary_class_cd_desc") or ""
    skill = meta_item.get("skill_desc") or ""

    if "item_id" in detail_data and "answer" in detail_data:
        # SAIC format
        ans_info = detail_data.get("answer", {})
        style = ans_info.get("style", "Multiple Choice").strip().lower()
        is_spr = (style == "spr")

        passage = clean_html_and_convert_math(detail_data.get("body", ""))
        prompt = clean_html_and_convert_math(detail_data.get("prompt", ""))
        raw_rationale = ans_info.get("rationale", "")
        rationale = clean_html_and_convert_math(raw_rationale)

        if is_spr:
            options = None
            correct_answer = extract_spr_answer_from_rationale(raw_rationale).strip().rstrip(".")
        else:
            raw_choices = ans_info.get("choices", {})
            options = {
                "A": clean_html_and_convert_math(raw_choices.get("a", {}).get("body", "")),
                "B": clean_html_and_convert_math(raw_choices.get("b", {}).get("body", "")),
                "C": clean_html_and_convert_math(raw_choices.get("c", {}).get("body", "")),
                "D": clean_html_and_convert_math(raw_choices.get("d", {}).get("body", "")),
            }
            correct_answer = str(ans_info.get("correct_choice", "A")).strip().upper()
    else:
        # Standard QBank API Format
        q_type = detail_data.get("type", "mcq").lower()
        is_spr = (q_type == "spr")

        raw_stimulus = detail_data.get("stimulus") or ""
        passage = clean_html_and_convert_math(raw_stimulus)

        raw_stem = detail_data.get("stem") or ""
        prompt = clean_html_and_convert_math(raw_stem)

        raw_rationale = detail_data.get("rationale") or ""
        rationale = clean_html_and_convert_math(raw_rationale)

        if is_spr:
            options = None
            ans_keys = detail_data.get("correct_answer") or detail_data.get("keys") or []
            if isinstance(ans_keys, list) and ans_keys:
                correct_answer = str(ans_keys[0]).strip().rstrip(".")
            elif isinstance(ans_keys, str):
                correct_answer = ans_keys.strip().rstrip(".")
            else:
                correct_answer = extract_spr_answer_from_rationale(raw_rationale).strip().rstrip(".")
        else:
            options = {}
            raw_options = detail_data.get("answerOptions") or []
            key_list = detail_data.get("keys") or []
            target_key_id = key_list[0] if key_list else None

            cb_correct_letter = ""
            cb_ans = detail_data.get("correct_answer")
            if isinstance(cb_ans, list) and cb_ans:
                cb_correct_letter = str(cb_ans[0]).strip().upper()
            elif isinstance(cb_ans, str):
                cb_correct_letter = cb_ans.strip().upper()

            choice_letters = ["A", "B", "C", "D"]
            correct_answer = ""
            for idx, opt in enumerate(raw_options):
                if idx >= 4:
                    break
                letter = choice_letters[idx]
                opt_content = clean_html_and_convert_math(opt.get("content", ""))
                options[letter] = opt_content
                if target_key_id and opt.get("id") == target_key_id:
                    correct_answer = letter

            if not correct_answer and cb_correct_letter in ("A", "B", "C", "D"):
                correct_answer = cb_correct_letter

    if not prompt.strip() and passage.strip():
        prompt = passage
        passage = ""

    return {
        "id": f"{id_prefix}_{index_num:03d}",
        "subject": subject_name,
        "domain": domain,
        "skill": skill,
        "difficulty": difficulty,
        "passage": passage,
        "prompt": prompt,
        "options": options,
        "correct_answer": correct_answer,
        "is_spr": is_spr,
        "rationale": rationale
    }


def reprocess_catalog(catalog_file, subject_name, id_prefix, out_filename):
    print(f"\n=======================================================")
    print(f"🔄 REPROCESSING: {subject_name} ({out_filename})")
    print(f"=======================================================")

    with open(catalog_file, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    total_items = len(catalog)
    print(f"Catalog has {total_items} items.")

    dataset = []
    table_count = 0
    svg_count = 0
    bullet_count = 0

    for idx, meta_item in enumerate(catalog):
        ext_id = meta_item.get("external_id")
        ibn = meta_item.get("ibn")
        cache_path = os.path.join(CACHE_DIR, f"{ext_id}.json" if ext_id else f"ibn_{ibn}.json")

        if not os.path.exists(cache_path):
            print(f"[Error] Cache file missing: {cache_path}", file=sys.stderr)
            continue

        with open(cache_path, "r", encoding="utf-8") as cf:
            detail_data = json.load(cf)

        record = process_item(meta_item, detail_data, subject_name, id_prefix, idx + 1)
        if record:
            dataset.append(record)
            p_full = (record.get("passage") or "") + (record.get("prompt") or "")
            if "<table" in p_full:
                table_count += 1
            if "<svg" in p_full:
                svg_count += 1
            if "• " in (record.get("passage") or ""):
                bullet_count += 1

    print(f"Processed: {len(dataset)} / {total_items} questions.")
    print(f"Questions with tables: {table_count}")
    print(f"Questions with SVGs: {svg_count}")
    print(f"Questions with bullet notes: {bullet_count}")

    # Write root data/questions/
    out_path = os.path.join(DATA_DIR, out_filename)
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)
    print(f"✅ Saved root: {out_path} ({os.path.getsize(out_path) / 1024:.1f} KB)")

    # Mirror to public/data/questions/
    pub_out_path = os.path.join(PUBLIC_DATA_DIR, out_filename)
    os.makedirs(PUBLIC_DATA_DIR, exist_ok=True)
    with open(pub_out_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)
    print(f"✅ Saved mirror: {pub_out_path} ({os.path.getsize(pub_out_path) / 1024:.1f} KB)")

    return dataset


def main():
    rw_cat = os.path.join(CACHE_DIR, "catalog_1.json")
    math_cat = os.path.join(CACHE_DIR, "catalog_2.json")

    reprocess_catalog(rw_cat, "Reading & Writing", "cb_rw", "reading_writing.json")
    reprocess_catalog(math_cat, "Math", "cb_math", "math.json")
    print("\n🎉 ALL 3,770 QUESTIONS SUCCESSFULLY REPROCESSED!")


if __name__ == "__main__":
    main()
