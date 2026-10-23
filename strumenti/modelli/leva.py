"""
La Bottega - leva di plastica (plastic pry tool / spudger). Set 1, tool 4 (R3: slide along the slot).
Run: /opt/blender/blender -b -P leva.py -- [--no-render] [--samples N]
Held pose: thin wedge tip down at the origin, blade plane = three.js XY (faces the camera),
handle up along +Y. Origin = middle of the wedge edge: put it on fessura_a, slide to fessura_b.
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *

def build():
    new_scene()
    root = empty("leva", size=0.04)
    # stations (z, cx, half-thickness x, half-width y) ; Blender: blade width along Y
    # correzioni PR #4: silhouette x1.5 in width and thickness (18 x 6.4 mm -> 27 x 9.6 mm), length and
    # tip position unchanged (origin = middle of the wedge edge, as before)
    K = 1.5
    body = loft("corpo_leva", [(z, 0, hx * K, hy * K) for (z, hx, hy) in (
        (0.000, 0.0004, 0.0070), (0.004, 0.0009, 0.0086), (0.016, 0.0016, 0.0090),
        (0.030, 0.0024, 0.0062), (0.040, 0.0030, 0.0056), (0.088, 0.0032, 0.0060),
        (0.100, 0.0032, 0.0056), (0.107, 0.0028, 0.0034), (0.110, 0.0020, 0.0012))],
        "salvia", chamfer=0.35)
    hole = cyl("hole", 0.0022 * K, 0.03, "salvia", seg=8, loc=(0, 0, 0.098), rot=(0, math.pi / 2, 0))
    boolean(body, hole)
    # grip ridges
    ridges = [box("rib", (0.0076 * K, 0.0100 * K, 0.0016), 0.0007, "salvia", 1, loc=(0, 0, 0.055 + i * 0.007))
              for i in range(4)]
    join(body, ridges)
    body.rotation_euler = (0, 0, math.pi / 2)    # blade width along Blender X (three.js X)
    apply_tf(body)
    parent_keep(body, root)
    return root

if __name__ == "__main__":
    r = build()
    export("leva.glb", r)
    if RENDER:
        setup_render()
        preview_tool(r, os.path.join(OUT, "preview_leva.png"), rot=(math.radians(90), 0, math.radians(90)), spin=-25,
                     elev=45, lens=70)
