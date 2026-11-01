"""Make out/<id>/contact.jpg (one frame every ~5 s) for quick visual review of each produced video."""
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from common import OUT  # noqa: E402

for v in sorted(OUT.glob("*/video.mp4")):
    out = v.parent / "contact.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(v), "-vf", "fps=1/5,scale=216:-1,tile=9x3:padding=4:color=white", "-frames:v", "1", "-q:v", "3", str(out)], check=False)
    print("contact sheet:", out)
