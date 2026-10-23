"""
La Bottega - pinzette (tweezers). Set 1, tool 5 (R5: hold on the spring, carry it to its seat).
Run: /opt/blender/blender -b -P pinzette.py -- [--no-render] [--samples N]
Held pose: tips down at the origin, joint up along three.js +Y, arms open along X (8 mm gap).
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
    st = [(0.000, s * 0.0042, 0.0007, 0.0014), (0.006, s * 0.0048, 0.0009, 0.0024),
          (0.030, s * 0.0062, 0.0009, 0.0034), (0.060, s * 0.0066, 0.0009, 0.0038),
          (0.095, s * 0.0045, 0.0009, 0.0038), (TOP, s * 0.0016, 0.0010, 0.0038)]
    a = loft(name, st, "argento", chamfer=0.3)
    grip = {p.index for p in a.data.polygons if 0.032 < p.center.z < 0.072 and p.center.x * s > 0}
    paint(a, "miele", as_mat="metallo", faces=grip)    # gilded grip band, same draw call
    cap = box("cap", (0.0026, 0.0078, 0.010), 0.0008, "argento", 1, loc=(s * 0.0013, 0, TOP - 0.003))
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
