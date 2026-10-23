"""
La Bottega - lente (magnifier). Set 1, tool 1 (PRIMI_ISTANTI B6, R4).
Run: /opt/blender/blender -b -P lente.py -- [--no-render] [--samples N]
Held pose: lens faces the camera (three.js +Z), handle points down (-Y) towards the finger
(the game draws the lens 70 px above the finger). Origin = lens centre.
Nodes: lente (root) > montatura (rim + handle, bottega_opaco), vetro_lente (own material
lente_vetro: the game can swap it for the x2 render-target view).
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *

RL = 0.031   # glass radius

def build():
    new_scene()
    root = empty("lente", size=0.04)
    rim = lathe("montatura", [
        (RL - 0.0015, -0.0045, "miele"), (RL + 0.0035, -0.0045, "miele"), (RL + 0.0055, -0.0025, "miele"),
        (RL + 0.0055, 0.0025, "miele"), (RL + 0.0035, 0.0045, "miele"), (RL - 0.0015, 0.0045, "miele"),
        (RL - 0.0015, -0.0045, "miele")], seg=20, smooth_angle=50)
    rim.rotation_euler = (math.pi / 2, 0, 0)          # lens axis = Blender Y (three.js Z)
    apply_tf(rim)
    collar = cyl("collar", 0.0075, 0.010, "miele", seg=10, bevel=0.0015, loc=(0, 0, -(RL + 0.009)))
    handle = lathe("manico", [
        (0.0, -0.110, "nocciola"), (0.0055, -0.110, "nocciola"), (0.0080, -0.106, "nocciola"),
        (0.0085, -0.095, "nocciola"), (0.0070, -0.060, "nocciola"), (0.0068, -0.045, "nocciola"),
        (0.0, -0.045, "nocciola")], seg=10, smooth_angle=50)
    ring = cyl("anello", 0.0089, 0.004, "terracotta", seg=10, loc=(0, 0, -0.100))
    join(rim, [collar, handle, ring])
    glass = lathe("vetro_lente", [(0.0, -0.0022, "crema"), (RL * 0.6, -0.0018, "crema"),
                                  (RL, -0.0008, "crema"), (RL, 0.0008, "crema"),
                                  (RL * 0.6, 0.0018, "crema"), (0.0, 0.0022, "crema")], seg=20, smooth_angle=60)
    glass.rotation_euler = (math.pi / 2, 0, 0)
    apply_tf(glass)
    flat(glass, mat_flat("lente_vetro", "#DCEFF0", 0.05, 0.0, alpha=0.35))
    parent_keep(rim, root)
    parent_keep(glass, root)
    empty("punta_lente", (0, 0, 0), parent=root)   # sight point = lens centre
    return root

if __name__ == "__main__":
    r = build()
    export("lente.glb", r)
    if RENDER:
        setup_render()
        preview_tool(r, os.path.join(OUT, "preview_lente.png"), rot=(math.radians(90), 0, 0), spin=-30,
                     elev=40, azim=-15)
