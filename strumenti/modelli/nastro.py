"""
La Bottega - nastro isolante (electrical tape roll). Set 1, tool 6 (R6: circle 720 deg around the wire).
Run: /opt/blender/blender -b -P nastro.py -- [--no-render] [--samples N]
Rests flat (roll axis = three.js Y). Nodes: nastro (root, origin = roll centre at mid-height)
> rotolo (tape + core + loose tail; pivot on the roll axis: unwinding = rotation.y).
Same honey colour as telecomando/nastro_filo.
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *

RO, RI, RC, HH = 0.029, 0.0185, 0.0160, 0.0095   # tape outer, tape inner, core inner, half height

def build():
    new_scene()
    root = empty("nastro", size=0.04)
    tape = lathe("rotolo", [
        (RI, -HH, "miele"), (RO - 0.0015, -HH, "miele"), (RO, -HH + 0.0015, "miele"),
        (RO, HH - 0.0015, "miele"), (RO - 0.0015, HH, "miele"), (RI, HH, "miele"), (RI, -HH, "miele")],
        seg=20, smooth_angle=50)
    core = lathe("core", [
        (RC, -HH - 0.0004, "carta"), (RI + 0.0004, -HH - 0.0004, "carta"), (RI + 0.0004, HH + 0.0004, "carta"),
        (RC, HH + 0.0004, "carta"), (RC, -HH - 0.0004, "carta")], seg=20, smooth_angle=50)
    # loose tail: a short strip leaving the roll tangentially and curling down to the bench
    tail = loft("lembo", [(0.000, 0, 0.0005, HH - 0.0006), (0.012, 0.0015, 0.0005, HH - 0.0006),
                          (0.020, 0.0045, 0.0005, HH - 0.0006), (0.026, 0.0090, 0.0005, HH - 0.0006)],
                "miele", chamfer=0.1)
    tail.rotation_euler = (0, math.radians(90), 0)           # strip runs along +X
    tail.location = (0.0, -RO - 0.0004, 0.0)
    apply_tf(tail)
    for v in tail.data.vertices:                              # droop towards the bench
        v.co.z -= 0.25 * max(0.0, v.co.x) ** 1.0 * 0.6
    join(tape, [core, tail])
    smooth(tape, 50)
    parent_keep(tape, root)
    return root

if __name__ == "__main__":
    r = build()
    export("nastro.glb", r)
    if RENDER:
        setup_render()
        preview_tool(r, os.path.join(OUT, "preview_nastro.png"), rot=(0, 0, 0), spin=-20, elev=40, lens=70)
