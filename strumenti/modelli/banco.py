"""
La Bottega - banco (Ettore's workbench). Set 1.
Run: /opt/blender/blender -b -P banco.py -- [--no-render] [--samples N]

Origin = top of the green cloth (panno) at the bench centre = the game's y = 0 plane.
Same unscaled set units as torcia.glb (game: scale 1.35 -> top 1.08 x 0.62 m like scena.js).
PRIMI_ISTANTI 5.1: "vassoietto (sx) e cassetto (dx) sul banco, nel mondo":
  * vassoietto (tin tray, left) is static, merged in `banco`; empty `vassoietto` marks where the
    screw / old batteries land (B7, B9);
  * cassettiera (small drawer unit, right) static in `banco`; `cassetto` is its own node,
    pivot = closed position, opens by sliding along three.js +Z (towards the camera):
    cassetto.position.z = APERTURA * t, APERTURA = 0.075; it carries pila_nuova_a/_b (B10).
Front of the bench faces the camera (three.js +Z = Blender -Y).
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *
from torcia import pila

TW, TD, TT = 0.80, 0.46, 0.040     # top width, depth, thickness
ZT = -0.004                        # top surface (cloth is 4 mm)
LEG_Z = -0.66
TRAY = (-0.270, -0.050)
DRAWER_UNIT = (0.275, 0.070)

def build():
    new_scene()
    root = empty("banco", size=0.1)
    parts = []
    # planks (4, along X) with 2 mm gaps
    n, gap = 4, 0.0025
    pw = (TD - (n - 1) * gap) / n
    for i in range(n):
        y = -TD / 2 + pw / 2 + i * (pw + gap)
        parts.append(box("plank", (TW, pw, TT), 0.004, "legno" if i % 2 == 0 else "legno_chiaro", 1,
                         loc=(0, y, ZT - TT / 2)))
    parts.append(box("under", (TW - 0.01, TD - 0.01, 0.010), 0.0, "legno_scuro", 1,
                     loc=(0, 0, ZT - TT + 0.004)))
    # apron + legs + low shelf
    for (sx, sy, x, y) in ((TW - 0.07, 0.022, 0, -TD / 2 + 0.04), (TW - 0.07, 0.022, 0, TD / 2 - 0.04),
                           (0.022, TD - 0.09, -TW / 2 + 0.04, 0), (0.022, TD - 0.09, TW / 2 - 0.04, 0)):
        parts.append(box("apron", (sx, sy, 0.065), 0.003, "legno_scuro", 1, loc=(x, y, ZT - TT - 0.0325)))
    for x in (-TW / 2 + 0.045, TW / 2 - 0.045):
        for y in (-TD / 2 + 0.045, TD / 2 - 0.045):
            parts.append(box("leg", (0.05, 0.05, ZT - TT - LEG_Z), 0.005, "legno_scuro", 1,
                             loc=(x, y, (ZT - TT + LEG_Z) / 2)))
    parts.append(box("shelf", (TW - 0.12, TD - 0.10, 0.022), 0.003, "legno", 1, loc=(0, 0, LEG_Z + 0.16)))
    # panno (cloth mat) with a cream stitched border
    parts.append(box("panno", (0.250, 0.180, 0.004), 0.0012, "salvia", 1, loc=(0, -0.022, -0.002)))
    for (sx, sy, x, y) in ((0.236, 0.0025, 0, -0.022 - 0.083), (0.236, 0.0025, 0, -0.022 + 0.083),
                           (0.0025, 0.166, -0.118, -0.022), (0.0025, 0.166, 0.118, -0.022)):
        parts.append(box("cucitura", (sx, sy, 0.0008), 0.0, "crema", 1, loc=(x, y, 0.0001)))
    # vassoietto (tin tray)
    tx, ty = TRAY
    tray = box("vassoietto_m", (0.125, 0.092, 0.018), 0.006, "acciaio", 2, loc=(tx, ty, ZT + 0.009), as_mat="opaco")
    cut = box("cut", (0.113, 0.080, 0.02), 0.004, "acciaio", 2, loc=(tx, ty, ZT + 0.0125), as_mat="opaco")
    boolean(tray, cut)
    paint(tray, "acciaio", as_mat="opaco")
    parts.append(tray)
    # cassettiera body with the drawer opening on the front
    cx, cy = DRAWER_UNIT
    unit = box("cassettiera", (0.155, 0.125, 0.068), 0.005, "carta", 2, loc=(cx, cy, ZT + 0.034))
    cut = box("cut", (0.136, 0.130, 0.049), 0.002, "legno_scuro", 1, loc=(cx, cy - 0.012, ZT + 0.0305))
    boolean(unit, cut)
    paint(unit, "carta")
    inside = {p.index for p in unit.data.polygons
              if abs(p.center.x - cx) < 0.0681 and ZT + 0.0059 < p.center.z < ZT + 0.0549 and p.center.y > cy - 0.0624}
    paint(unit, "legno_scuro", faces=inside)
    parts.append(unit)
    parts.append(box("cassettiera_top", (0.165, 0.133, 0.008), 0.003, "terracotta", 1, loc=(cx, cy, ZT + 0.071)))
    plank0 = parts.pop(0)
    join(plank0, parts)
    plank0.name = "banco_mesh"
    set_origin(plank0, (0, 0, 0))
    parent_keep(plank0, root)

    # ---------------- cassetto (drawer) - own node
    front_y = cy - 0.0625
    dz = ZT + 0.0075
    drawer = box("cassetto", (0.130, 0.110, 0.004), 0.001, "legno_chiaro", 1, loc=(cx, front_y + 0.059, dz + 0.002))
    sides = [box("side", (0.004, 0.110, 0.040), 0.001, "legno_chiaro", 1, loc=(cx + sx, front_y + 0.059, dz + 0.020))
             for sx in (-0.063, 0.063)]
    sides.append(box("back", (0.130, 0.004, 0.040), 0.001, "legno_chiaro", 1, loc=(cx, front_y + 0.112, dz + 0.020)))
    sides.append(box("front", (0.146, 0.008, 0.050), 0.003, "terracotta", 1, loc=(cx, front_y + 0.001, dz + 0.022)))
    sides.append(lathe("pomello", [(0, 0, "miele"), (0.0045, 0, "miele"), (0.0065, 0.004, "miele"),
                                   (0.0065, 0.008, "miele"), (0.0040, 0.010, "miele"), (0, 0.010, "miele")],
                       seg=10, smooth_angle=50))
    sides[-1].rotation_euler = (math.pi / 2, 0, 0)
    sides[-1].location = (cx, front_y - 0.003, dz + 0.024)
    join(drawer, sides)
    set_origin(drawer, (cx, front_y, dz))
    parent_keep(drawer, root)
    # new batteries lying along X inside the drawer, near the front so they show when it opens
    for name, y in (("pila_nuova_a", front_y + 0.022), ("pila_nuova_b", front_y + 0.050)):
        p = pila(name, nuova=True)
        p.rotation_euler = (0, math.radians(90), 0)
        p.location = (cx, y, dz + 0.004 + 0.013)
        parent_keep(p, drawer)
    # ---------------- landing points
    empty("vassoietto", (tx, ty, ZT + 0.003), parent=root)
    empty("centro_banco", (0, -0.022, 0), parent=root)
    return root

def previews(root):
    cam, floor = setup_render(res=(1280, 900))
    floor.location.z = LEG_Z
    O = {o.name: o for o in bpy.data.objects}
    meshes = [o for o in root.children_recursive if o.type == "MESH"]
    frame(cam, meshes, elev=24, azim=-22, lens=45, margin=1.12)
    render(os.path.join(OUT, "preview_banco.png"))
    # drawer open, close-up of the right side of the top
    O["cassetto"].location.y -= 0.075
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = 1024, 1024
    frame(cam, [O["cassetto"], O["pila_nuova_a"], O["pila_nuova_b"]], elev=40, azim=-25, lens=60, margin=1.7,
          aim_offset=(0, 0.02, 0))
    render(os.path.join(OUT, "preview_banco_cassetto_aperto.png"))

if __name__ == "__main__":
    r = build()
    export("banco.glb", r)
    if RENDER:
        previews(r)
