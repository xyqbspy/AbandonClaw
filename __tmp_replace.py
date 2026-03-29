from pathlib import Path
path = Path(r"src/features/scene/components/scene-practice-view.tsx")
text = path.read_text(encoding="utf-8")
start = text.index("  return (")
end = text.rindex("\n}\n")
new_block = '''PLACEHOLDER'''
path.write_text(text[:start] + new_block + text[end:], encoding="utf-8")
