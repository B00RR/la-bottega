"""
La Bottega - pinzette (tweezers). Set 1, tool 5 (R5: hold on the spring, carry it to its seat).
Run: /opt/blender/blender -b -P pinzette.py -- [--no-render] [--samples N]
Held pose: tips down at the origin, joint up along three.js +Y, arms open along X (7 mm gap between the tips).
Nodes: pinzette (root, origin = between the tips = grab point) > braccio_sx, braccio_dx
(pivot at the joint). Close: braccio_sx.rotation.z = +CHIUSURA, braccio_dx.rotation.z = -CHIUSURA,
CHIUSURA = 0.033 rad (tips touch).
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *

TOP = 0.118

def arm(name, side):
    s = side
    # correzioni PR #4: silhouette x1.5 (arm width 7.6 -> 11.4 mm, strip 1.8 -> 2.7 mm, outer spread
    # 15 -> 22.5 mm). The inner edge of the tips (3.5 mm from the axis) and the joint stay where they
    # were, so the pivots and CHIUSURA = 0.033 rad are unchanged.
    st = [(0.000, s * 0.00455, 0.00105, 0.0021), (0.006, s * 0.00525, 0.00135, 0.0036),
          (0.030, s * 0.0090, 0.00135, 0.0051), (0.060, s * 0.0099, 0.00135, 0.0057),
          (0.095, s * 0.0068, 0.00135, 0.0057), (TOP, s * 0.0021, 0.0015, 0.0057)]
    a = loft(name, st, "acciaio_chiaro", chamfer=0.3)     # #C9BFB4 on bottega_metallo (metal 0.4)
    grip = {p.index for p in a.data.polygons if 0.032 < p.center.z < 0.072 and p.center.x * s > 0}
    paint(a, "miele", as_mat="metallo", faces=grip)    # gilded grip band, same draw call
    cap = box("cap", (0.0039, 0.0117, 0.010), 0.0010, "acciaio_chiaro", 1, loc=(s * 0.00195, 0, TOP - 0.003))
    join(a, [cap])
    set_origin(a, (s * 0.0016, 0, TOP - 0.004))
    return a

def build():
    new_scene()
    root = empty("pinzette", size=0.04)
    for name, s in (("braccio_sx", -1), ("braccio_dx", 1)):
        parent_keep(arm(name, s), root)
    empty("presa", (0, 0, 0.002), parent=root)
    return root

if __name__ == "__main__":
    r = build()
    export("pinzette.glb", r)
    if RENDER:
        setup_render()
        preview_tool(r, os.path.join(OUT, "preview_pinzette.png"), rot=(0, math.radians(90), 0), spin=-25,
                     elev=48, lens=70)
