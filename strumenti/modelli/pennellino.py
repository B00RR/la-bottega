"""
La Bottega - pennellino (small brush). Set 1, tool 3 (B8: rub the green spring clean).
Run: /opt/blender/blender -b -P pennellino.py -- [--no-render] [--samples N]
Held pose: bristle tip down at the origin, handle up along three.js +Y.
Nodes: pennellino (root, origin = bristle tip) > manico_pennello (handle + ferrule),
setole (bristles, pivot at the ferrule: bend them with rotation.x/z while rubbing).
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *

def build():
    new_scene()
    root = empty("pennellino", size=0.04)
    setole = lathe("setole", [
        (0.0, 0.0015, "crema"), (0.0045, 0.0010, "crema"), (0.0082, 0.0060, "carta"),
        (0.0094, 0.0140, "carta"), (0.0086, 0.0210, "carta"), (0.0068, 0.0275, "carta"),
        (0.0, 0.0275, "carta")], seg=12, smooth_angle=55)
    # ragged tuft: every other vertex of the tip ring pokes out and down
    for v in setole.data.vertices:
        r = math.hypot(v.co.x, v.co.y)
        if 0.003 < r < 0.006 and v.co.z < 0.002:
            k = round(math.atan2(v.co.y, v.co.x) / (2 * math.pi / 12)) % 2
            v.co.z = -0.0015 if k == 0 else 0.0025
            v.co.x *= 1.35 if k == 0 else 1.0; v.co.y *= 1.35 if k == 0 else 1.0
    set_origin(setole, (0, 0, 0.026))
    manico = lathe("manico_pennello", [
        (0.0, 0.0255, "argento"), (0.0072, 0.0255, "argento"), (0.0076, 0.0290, "argento"),
        (0.0068, 0.0310, "argento"), (0.0072, 0.0335, "argento"), (0.0062, 0.0440, "argento"),
        (0.0050, 0.0460, "legno"), (0.0058, 0.0560, "legno"), (0.0066, 0.0800, "legno"),
        (0.0050, 0.1250, "legno"), (0.0046, 0.1260, "terracotta"), (0.0036, 0.1470, "terracotta"),
        (0.0020, 0.1510, "terracotta"), (0.0, 0.1515, "terracotta")], seg=10, smooth_angle=40, as_mat="opaco")
    parent_keep(manico, root)
    parent_keep(setole, root)
    return root

if __name__ == "__main__":
    r = build()
    export("pennellino.glb", r)
    if RENDER:
        setup_render()
        preview_tool(r, os.path.join(OUT, "preview_pennellino.png"), rot=(0, math.radians(90), 0), spin=-25)
