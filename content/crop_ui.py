from pathlib import Path
from PIL import Image

ROOT = Path(r"D:\deepseek-harness\default-workspace")
SHOTS = ROOT / "screenshots"
OUT = ROOT / "deliverables" / "assets"
OUT.mkdir(parents=True, exist_ok=True)

CROPS = {
    "ui_gate.png": ("gate.png", (264, 80, 1136, 960)),
    "ui_plan.png": ("plan-english.png", (264, 80, 1136, 960)),
    "ui_method.png": ("plan-audit.png", (264, 80, 1136, 960)),
    "ui_summary.png": ("summary-english.png", (264, 80, 1136, 960)),
    "ui_memory.png": ("memory-english.png", (264, 80, 1440, 960)),
    "ui_report.png": ("report-english.png", (264, 80, 1440, 960)),
    "ui_library.png": ("library.png", (264, 80, 1440, 960)),
    "ui_makeup.png": ("plan-makeup.png", (264, 80, 1136, 960)),
}

for name, (src, box) in CROPS.items():
    im = Image.open(SHOTS / src).convert("RGB")
    im.crop(box).save(OUT / name, quality=95)
    print(name, im.crop(box).size)
