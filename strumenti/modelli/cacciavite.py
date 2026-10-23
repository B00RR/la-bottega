"""
La Bottega - cacciavite a croce (Phillips screwdriver). Set 1, tool 2 (B7, B11).
Run: /opt/blender/blender -b -P cacciavite.py -- [--no-render] [--samples N]
Held pose: tip down at the origin, handle up along three.js +Y. Origin = Phillips tip on the
shaft axis, so rotation.y spins it in place on the screw. 2 primitives: handle (opaco), shaft (metallo).
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *

def build():
    new_scene()
    root = empty("cacciavite", size=0.04)
    shaft = lathe("corpo_cacciavite", [
        (0.0, 0.0, "argento"), (0.0016, 0.0035, "argento"), (0.0030, 0.0090, "argento"),
        (0.0030, 0.072, "argento"), (0.0, 0.072, "argento")], seg=8, smooth_angle=50)
    # Phillips flutes: four shallow notches on the tip cone (vertex nudge on the 2nd ring)
    for v in shaft.data.vertices:
        if 0.002 < v.co.z < 0.005:
            a = math.atan2(v.co.y, v.co.x)
            if round(a / (math.pi / 4)) % 2 == 1:
                v.co.x *= 0.45; v.co.y *= 0.45
    handle = lathe("manico", [
        (0.0, 0.066, "crema"), (0.0060, 0.066, "crema"), (0.0085, 0.070, "crema"),
        (0.0095, 0.078, "terracotta"), (0.0125, 0.090, "terracotta"), (0.0130, 0.124, "salvia"),
        (0.0130, 0.131, "terracotta"), (0.0130, 0.140, "terracotta"),
        (0.0120, 0.150, "crema"), (0.0120, 0.158, "crema"), (0.0090, 0.165, "crema"),
        (0.0, 0.166, "crema")], seg=12, smooth_angle=35)
    # grip flutes: pull in every other column of the handle body
    for v in handle.data.vertices:
        if 0.086 < v.co.z < 0.145 and not (0.123 < v.co.z < 0.132):
            a = math.atan2(v.co.y, v.co.x)
            if round(a / (2 * math.pi / 12)) % 2 == 1:
                v.co.x *= 0.86; v.co.y *= 0.86
    join(shaft, [handle])
    smooth(shaft, 35)
    parent_keep(shaft, root)
    empty("impugnatura", (0, 0, 0.115), parent=root)
    return root

if __name__ == "__main__":
    r = build()
    export("cacciavite.glb", r)
    if RENDER:
        setup_render()
        preview_tool(r, os.path.join(OUT, "preview_cacciavite.png"), rot=(0, math.radians(90), 0), spin=-25)
