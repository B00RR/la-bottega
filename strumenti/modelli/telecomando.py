"""
La Bottega - telecomando (Ettore's TV remote). Set 1.
Run:  /opt/blender/blender -b -P telecomando.py -- [--no-render] [--samples N]

PRIMI_ISTANTI 3.2 (R1-R8): tap ON (tasto_on) -> turn on the vertical axis until the side seam with the
slot shows -> plastic lever slides along the seam (fessura_a -> fessura_b, clicks at gancio_1..3 =
25/50/75 %) -> shell opens -> lens on two points (rame, molla) -> tweezers carry `molla` onto
`sede_molla` -> tape wraps `filo` (nastro_filo grows) -> drag top shell back -> tap ON.

Lies face-up on the bench. Units: metres, Y up (three.js); same unscaled set units as torcia.glb.
Long axis = three.js Z (IR front at -Z, towards the TV); slot side = +X.
Pivots (three.js):
  guscio  (= id `guscio` of scena.js; top shell) hinge on the -X seam edge; open = rotation.z > 0 (lifts the +X / slot side)
  tasto_on      base of the button; press = position.y -= 0.0015
  molla         centre of the loose spring; animate position+quaternion to sede_molla's
  nastro_filo   start of the wrap on the wire axis; wrap = scale.z 0->1 (grows towards +Z)
"""
import bpy, bmesh, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *

W, L, H = 0.066, 0.176, 0.026   # width (x), length (y, Blender), height
SEAM = 0.011                    # top of the bottom shell
WALL = 0.0028
BEV = 0.0075

def half_shell(name, top, key_out, key_in):
    ob = box(name, (W, L, H), BEV, key_out, segments=2, loc=(0, 0, H / 2))
    apply_tf(ob)
    me = ob.data
    bm = bmesh.new(); bm.from_mesh(me)
    zc = SEAM + (0.0006 if top else 0.0)     # 0.6 mm gap = visible seam line
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, zc), plane_no=(0, 0, 1),
                           clear_inner=top, clear_outer=not top)
    bnd = [e for e in bm.edges if e.is_boundary]
    bmesh.ops.holes_fill(bm, edges=bnd, sides=0)
    bm.to_mesh(me); bm.free()
    inner = box("in", (W - 2 * WALL, L - 2 * WALL, H - 2 * WALL), BEV - WALL, key_in, 2, loc=(0, 0, H / 2), as_mat="opaco")
    boolean(ob, inner)
    # repaint: outside key_out, everything facing the cavity key_in
    paint(ob, key_out)
    me = ob.data
    lim = (W / 2 - WALL + 1e-4, L / 2 - WALL + 1e-4, WALL - 1e-4, H - WALL + 1e-4)
    cav = set()
    for p in me.polygons:
        c = p.center
        if abs(c.x) < lim[0] and abs(c.y) < lim[1] and lim[2] < c.z < lim[3]:
            cav.add(p.index)
    paint(ob, key_in, as_mat="opaco", faces=cav)
    return ob

def build():
    new_scene()
    root = empty("telecomando", size=0.05)

    # ---------------- guscio_sotto (static: shell + clips + PCB + batteries + contacts)
    sotto = half_shell("guscio_sotto", False, "nocciola", "acciaio")
    # pry slot (fessura) notch on the +X seam at fessura_a
    cut = box("cut", (0.010, 0.016, 0.0036), 0.0006, "grafite", 1, loc=(W / 2, 0.059, SEAM))
    boolean(sotto, cut)
    parts = []
    # gancetti: 3 clips on the +X inner wall, rising above the seam (hidden when closed)
    for y in (0.0295, 0.0, -0.0295):
        parts.append(box("clip", (0.0022, 0.009, 0.0075), 0.0005, "miele", 1,
                         loc=(W / 2 - WALL - 0.0011, y, SEAM - 0.0005)))
        parts.append(box("hook", (0.0026, 0.009, 0.0016), 0.0005, "miele", 1,
                         loc=(W / 2 - WALL - 0.0030, y, SEAM + 0.0022)))
    # PCB (front half) with chips
    parts.append(box("pcb", (W - 2 * WALL - 0.002, 0.098, 0.0016), 0.0004, "salvia", 1,
                     loc=(0, 0.031, 0.0045)))
    for (x, y, sx, sy) in ((0.008, 0.050, 0.014, 0.010), (-0.004, 0.068, 0.008, 0.008),
                           (0.016, 0.010, 0.008, 0.012)):
        parts.append(box("chip", (sx, sy, 0.0025), 0.0006, "grafite", 1, loc=(x, y, 0.0063)))
    parts.append(cyl("led", 0.0025, 0.006, "rosso", seg=8, loc=(0, 0.080, 0.0075),
                     rot=(math.pi / 2, 0, 0), as_mat="opaco"))
    # battery bay: two AAA cells along Y, contacts at both ends
    for x, y0 in ((-0.0115, -0.0485), (0.0115, -0.0445)):
        b = lathe("aaa", [(0, -0.026, "argento"), (0.0058, -0.026, "miele"), (0.0065, -0.0245, "miele"),
                          (0.0065, 0.0245, "crema"), (0.0058, 0.026, "argento"), (0.0025, 0.026, "argento"),
                          (0.0025, 0.0285, "argento"), (0, 0.0285, "argento")],
                  seg=8, smooth_angle=50, as_mat="opaco")
        b.rotation_euler = (-math.pi / 2, 0, 0)   # + pole towards +Y (front)
        b.location = (x, y0, WALL + 0.0068)
        parts.append(b)
    for x in (-0.0115, 0.0115):
        parts.append(box("plate", (0.010, 0.0012, 0.010), 0.0003, "argento", 1,
                         loc=(x, -0.0164, WALL + 0.0068), as_mat="opaco"))
    parts.append(box("plate", (0.010, 0.0012, 0.010), 0.0003, "argento", 1,
                     loc=(-0.0115, -0.0810, WALL + 0.0068), as_mat="opaco"))
    # the OTHER cell's spring is fine (static); the loose one is `molla`
    ok = helix("molla_ok", 0.0038, 0.0055, 3.0, 0.0006, "argento", seg_turn=6, sides=4, as_mat="opaco")
    ok.rotation_euler = (-math.pi / 2, 0, 0)
    ok.location = (-0.0115, -0.0805, WALL + 0.0068)
    parts.append(ok)
    # empty seat plate for the loose spring (ghost target)
    parts.append(box("plate", (0.010, 0.0012, 0.010), 0.0003, "argento", 1,
                     loc=(0.0115, -0.0810, WALL + 0.0068), as_mat="opaco"))
    join(sotto, parts)
    ao(sotto, 0.0, 0.006)          # correzioni PR #4: vertex AO -14% on the bottom (contact with the bench)

    # ---------------- guscio (top shell) (lid + all static buttons)
    sopra = half_shell("guscio", True, "nocciola", "acciaio")
    btn = []
    for i, (x, key) in enumerate(((-0.015, "salvia"), (0.015, "miele"))):
        btn.append(box("rocker", (0.013, 0.030, 0.006), 0.003, key, 2, loc=(x, 0.022, H + 0.0005)))
    for r_ in range(3):
        for c_ in range(3):
            btn.append(cyl("num", 0.0046, 0.005, "crema", seg=8, bevel=0.0012,
                           loc=((c_ - 1) * 0.017, -0.018 - r_ * 0.017, H + 0.0004)))
    btn.append(box("ir", (0.030, 0.004, 0.008), 0.0015, "grafite", 1, loc=(0, L / 2 - 0.0005, SEAM + 0.007)))
    btn.append(box("logo", (0.020, 0.004, 0.0012), 0.0006, "terracotta", 1, loc=(0, -0.073, H + 0.0002)))
    join(sopra, btn)
    set_origin(sopra, (-W / 2, 0, SEAM))

    tasto_on = cyl("tasto_on", 0.0065, 0.0055, "rosso", seg=10, bevel=0.0018, loc=(-0.014, 0.058, H + 0.0006))
    set_origin(tasto_on, (-0.014, 0.058, H - 0.0005))

    # ---------------- filo (red wire, bare copper at `rame`)
    RAME_Y = 0.010
    cu = bpy.data.curves.new("filo", "CURVE")
    cu.dimensions = "3D"; cu.bevel_depth = 0.0021; cu.bevel_resolution = 1; cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    pts = [(-0.0215, -0.0165, 0.0070), (-0.0235, -0.006, 0.0085), (-0.0235, RAME_Y - 0.010, 0.0090),
           (-0.0235, RAME_Y, 0.0090), (-0.0235, RAME_Y + 0.010, 0.0090), (-0.0230, 0.030, 0.0085),
           (-0.0190, 0.042, 0.0070), (-0.0120, 0.050, 0.0058)]
    sp.points.add(len(pts) - 1)
    for i, p in enumerate(pts):
        sp.points[i].co = (*p, 1)
    filo = link(bpy.data.objects.new("filo", cu))
    for o in bpy.context.selected_objects: o.select_set(False)
    filo.select_set(True); bpy.context.view_layer.objects.active = filo
    bpy.ops.object.convert(target="MESH")
    filo = bpy.context.active_object; filo.name = "filo"
    paint(filo, "grafite")
    bare = {p.index for p in filo.data.polygons if abs(p.center.y - RAME_Y) < 0.0055}
    paint(filo, "rame", as_mat="opaco", faces=bare)
    for v in filo.data.vertices:          # stripped section is thinner (insulation gone)
        if abs(v.co.y - RAME_Y) < 0.0052:
            v.co.x = -0.0235 + (v.co.x + 0.0235) * 0.55
            v.co.z = 0.0090 + (v.co.z - 0.0090) * 0.55
    smooth(filo, 50)
    set_origin(filo, (-0.0235, RAME_Y, 0.0090))

    # ---------------- nastro_filo: tape sleeve over the bare copper, grows along three.js +Z
    nastro = lathe("nastro_filo", [(0, 0, "miele"), (0.0030, 0, "miele"), (0.0034, 0.002, "miele"),
                                   (0.0034, 0.014, "miele"), (0.0030, 0.016, "miele"), (0, 0.016, "miele")],
                   seg=8, smooth_angle=50)
    nastro.rotation_euler = (math.pi / 2, 0, 0)       # local +Z -> Blender -Y (three.js +Z)
    nastro.location = (-0.0235, RAME_Y + 0.008, 0.0090)
    apply_tf(nastro, loc=False, rot=True, scale=False)

    # ---------------- molla (loose spring) + sede_molla (its seat)
    molla = helix("molla", 0.0046, 0.0085, 4.0, 0.0008, "argento", seg_turn=6, sides=4)
    molla.data.transform(Matrix.Translation((0, 0, -0.00425)))     # centre the coil
    molla.data.transform(Matrix.Rotation(-math.pi / 2, 4, "X"))    # local axis = Blender +Y (= seat axis)
    molla.location = (0.010, 0.026, 0.0105)                      # dumped on the PCB
    molla.rotation_euler = (0, math.radians(80), math.radians(35))

    for ob in (sotto, sopra, tasto_on, filo, nastro, molla):
        parent_keep(ob, root)
    parent_keep(tasto_on, sopra)
    empty("sede_molla", (0.0115, -0.0805 + 0.00425, WALL + 0.0068), parent=root)
    empty("rame", (-0.0235, RAME_Y, 0.0090), parent=root)
    empty("fessura_a", (W / 2, 0.059, SEAM), parent=root)
    empty("fessura_b", (W / 2, -0.059, SEAM), parent=root)
    for i, y in enumerate((0.0295, 0.0, -0.0295), 1):
        empty(f"gancio_{i}", (W / 2, y, SEAM), parent=root)
    empty("centro_telecomando", (0, 0, H), parent=root)
    empty("centro_interno", (0, 0, 0.008), parent=root)
    return root

def previews(root):
    cam, floor = setup_render()
    O = {o.name: o for o in bpy.data.objects}
    parts = [o for o in root.children_recursive if o.type == "MESH"]
    snap = snapshot(parts)
    nast = O["nastro_filo"]
    # (a) assembled, 3/4 from the front-right (slot side visible)
    nast.hide_render = True
    root.rotation_euler = (0, 0, math.radians(-28))
    frame(cam, parts, elev=34, azim=28, lens=60, margin=1.0)
    render(os.path.join(OUT, "preview_telecomando_montato.png"))
    # (b) open (TC-INTERNO state): lid hinged open, loose spring and bare wire visible
    O["guscio"].rotation_euler.y = math.radians(-160)   # Blender: about -Y lifts +X? (see below)
    bpy.context.view_layer.update()
    root.rotation_euler = (0, 0, math.radians(-10))
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = 1280, 900
    frame(cam, parts, elev=52, azim=10, lens=55, margin=0.95)
    render(os.path.join(OUT, "preview_telecomando_aperto.png"))
    # (c) exploded: lid up, spring above its seat, tape sleeve half-wrapped above the wire
    restore(parts, snap)
    O["guscio"].location.z += 0.05
    O["tasto_on"].location.z += 0.012
    O["molla"].location = (0.0115, -0.078, 0.034)
    O["molla"].rotation_euler = (0, 0, 0)
    nast.hide_render = False
    nast.location.z += 0.012
    O["filo"].location.z += 0.008
    root.rotation_euler = (0, 0, math.radians(-25))
    frame(cam, parts, elev=26, azim=20, lens=55, margin=1.05)
    render(os.path.join(OUT, "preview_telecomando_esploso.png"))

if __name__ == "__main__":
    r = build()
    export("telecomando.glb", r)
    if RENDER:
        previews(r)
