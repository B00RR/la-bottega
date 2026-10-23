"""
La Bottega - torcia (flashlight). Source of truth, v2 (set 1).
Run:  /opt/blender/blender -b -P torcia.py -- [--no-render] [--samples N]

v2 vs approved v1 (same look, same proportions, same on-axis unscrewing cap):
  * shared vertex-colour materials (comune.py) -> 18 draw calls down to 10;
  * `bottone` is its own node (PRIMI_ISTANTI B4/B12: tap, it sinks 2 mm and comes back);
  * `contatto` (green contact spring) now sits ON THE CAP (B8: "La molla di contatto sul tappo
    e' verde") - child of `tappo`, cleaned with the brush;
  * the dead batteries carry an embossed "2019" on the end that faces the cap (B8);
  * batteries raised 6 mm so they rest on the spring.
Correzioni PR #4 (revisione DA 2026-10-23): torch head painted acciaio_chiaro #C9BFB4 on
bottega_metallo (metal 0.4); vertex AO -14% at the base (tappo), -12% on the tube/cap crevice and the screw.
Units: metres, Y up, same unscaled units as scena.js (game applies scale 1.35 to the whole set).
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *

R = 0.043

def pila(name, nuova=False, anno="2019"):
    """Battery, axis local Z, centred; '-' end (z<0) carries the year."""
    body = "foglia" if nuova else "oliva"
    p = lathe(name, [
        (0.0, -0.0230, "argento"), (0.0110, -0.0230, body), (0.0130, -0.0210, body),
        (0.0130, 0.0080, "crema"), (0.0130, 0.0170, body), (0.0130, 0.0210, body),
        (0.0110, 0.0230, "argento"), (0.0050, 0.0230, "argento"), (0.0050, 0.0280, "argento"),
        (0.0, 0.0280, "argento"),
    ], seg=10, smooth_angle=50, as_mat="opaco")
    if not nuova:
        t = text_mesh(name + "_anno", anno, 0.0085, 0.0008, "inchiostro")
        # text faces the - end; upright when the torch lies head-right, button to camera (local -X = up)
        t.rotation_euler = (math.pi, 0, -math.pi / 2)
        t.location = (0, 0, -0.0232)
        apply_tf(t)
        join(p, [t])
    return p

def build():
    new_scene()
    root = empty("torcia", size=0.05)

    corpo = lathe("corpo", [
        (0.0, 0.0955, "interno"), (0.0355, 0.0955, "interno"),
        (0.0355, 0.0300, "terracotta"), (0.0400, 0.0300, "terracotta"),
        (R, 0.0330, "terracotta"), (R, 0.1880, "terracotta"),
        (0.0455, 0.1940, "acciaio_chiaro"), (0.0540, 0.2260, "acciaio_chiaro"),
        (0.0570, 0.2320, "miele"), (0.0570, 0.2440, "miele"), (0.0540, 0.2500, "miele"),
        (0.0450, 0.2500, "miele"), (0.0450, 0.2470, "acciaio_chiaro"), (0.0, 0.2470, "acciaio_chiaro"),
    ])
    rings = [lathe("ring", [(R - 0.001, zc - 0.007, "salvia"), (R + 0.0025, zc - 0.005, "salvia"),
                            (R + 0.0025, zc + 0.005, "salvia"), (R - 0.001, zc + 0.007, "salvia")],
                   smooth_angle=60) for zc in (0.070, 0.165)]
    sw_base = box("sw_base", (0.020, 0.012, 0.034), 0.004, "salvia", 2, loc=(0, -(R - 0.001), 0.118))
    join(corpo, rings + [sw_base])
    ao(corpo, 0.030, 0.012, strength=0.12)     # crevice where the tube sits on the cap

    # bottone: origin on the button's base face, presses along three.js -Z (Blender +Y)
    bottone = box("bottone", (0.012, 0.010, 0.022), 0.0035, "miele", 2, loc=(0, -(R + 0.004), 0.120))
    set_origin(bottone, (0, -(R + 0.001), 0.120))

    vetro = lathe("vetro", [(0.0, 0.2470, "oro"), (0.0455, 0.2470, "oro"), (0.0455, 0.2490, "oro"),
                            (0.034, 0.2525, "oro"), (0.018, 0.2545, "oro"), (0.0, 0.2550, "oro")],
                  smooth_angle=50)
    flat(vetro, mat_flat("torcia_vetro", PAL["oro"], 0.2))

    # tappo: neck now ends at z=0.036 so the spring + batteries fit
    tappo = lathe("tappo", [
        (0.0, 0.0000, "salvia"), (0.0400, 0.0000, "salvia"), (0.0450, 0.0045, "salvia"),
        (0.0450, 0.0260, "salvia"), (0.0420, 0.0298, "salvia"),
        (0.0335, 0.0298, "acciaio"), (0.0350, 0.0320, "acciaio"), (0.0335, 0.0340, "acciaio"),
        (0.0335, 0.0360, "interno"), (0.0, 0.0360, "interno"),
    ], as_mat="opaco")
    bumps = []
    for i in range(12):
        a = 2 * math.pi * (i + 0.5) / 12
        bumps.append(box("bump", (0.005, 0.007, 0.016), 0.0016, "salvia", 1,
                         loc=(0.0448 * math.cos(a), 0.0448 * math.sin(a), 0.0152), rot=(0, 0, a)))
    join(tappo, bumps)
    ao(tappo, 0.0, 0.014)                       # vertex AO: base of the torch (contact with the bench)
    set_origin(tappo, (0, 0, 0.030))

    # macchia: green crust on the cap rim (B5 "sul bordo del tappo"), lens target
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.0095)
    macchia = bpy.context.active_object
    macchia.name = "macchia"
    macchia.scale = (1.0, 0.8, 0.28)
    apply_tf(macchia, loc=False, rot=False, scale=True)
    macchia.location = (0.026, -0.012, 0.0)
    flat(macchia, mat_flat("torcia_ossido", PAL["ossido"], 0.85))
    smooth(macchia, 80)

    vite = lathe("vite", [
        (0.0, -0.0040, "argento"), (0.0070, -0.0037, "argento"), (0.0105, -0.0025, "argento"),
        (0.0115, -0.0005, "argento"), (0.0115, 0.0010, "argento"), (0.0045, 0.0010, "argento"),
        (0.0050, 0.0060, "argento"), (0.0040, 0.0090, "argento"), (0.0050, 0.0120, "argento"),
        (0.0040, 0.0150, "argento"), (0.0025, 0.0180, "argento"), (0.0, 0.0185, "argento"),
    ], seg=10, smooth_angle=45)
    for sx, sy in ((0.016, 0.0032), (0.0032, 0.016)):
        c = box("cut", (sx, sy, 0.006), 0.0005, "inchiostro", 1, loc=(0, 0, -0.0050), as_mat="metallo")
        boolean(vite, c)
    smooth(vite, 30)
    ao(vite, -0.0040, 0.008, strength=0.12)
    set_origin(vite, (0, 0, -0.0015))

    # contatto: plate + two coil springs on the cap neck (ON THE CAP), oxidised green
    contatto = lathe("contatto", [(0.0, 0.0360, "argento"), (0.029, 0.0360, "argento"),
                                  (0.030, 0.0368, "argento"), (0.030, 0.0376, "argento"),
                                  (0.0, 0.0376, "argento")], smooth_angle=60)
    springs = []
    for x in (-0.016, 0.016):
        s = helix("molla_c", 0.0062, 0.0050, 2.0, 0.0011, "argento", seg_turn=7, sides=4, taper=0.6)
        s.location = (x, 0, 0.0372)
        springs.append(s)
    join(contatto, springs)
    flat(contatto, mat_flat("torcia_contatto", PAL["ossido"], 0.7, 0.25))
    set_origin(contatto, (0, 0, 0.0360))

    pila_a = pila("pila_a"); pila_a.location = (-0.016, 0, 0.0655)
    pila_b = pila("pila_b"); pila_b.location = (0.016, 0, 0.0655)

    for ob in (corpo, tappo, pila_a, pila_b, bottone):
        parent_keep(ob, root)
    parent_keep(vetro, corpo)
    for ob in (macchia, vite, contatto):
        parent_keep(ob, tappo)
    for name, loc in (("sede_a", (-0.016, 0, 0.0655)), ("sede_b", (0.016, 0, 0.0655)),
                      ("centro_torcia", (0, 0, 0.120))):
        empty(name, loc, parent=root)
    return root

def previews(root):
    cam, floor = setup_render()
    O = {o.name: o for o in bpy.data.objects}
    parts = [o for o in root.children_recursive if o.type == "MESH"]
    snap = snapshot(parts)
    def lay(yaw, lift=0.0, spin=0.0):
        root.matrix_world = (Matrix.Translation((0, 0, 0.0452 + lift))
                             @ Matrix.Rotation(math.radians(yaw), 4, "Z")
                             @ Matrix.Rotation(math.radians(90), 4, "Y")
                             @ Matrix.Rotation(math.radians(spin), 4, "Z")
                             @ Matrix.Translation((0, 0, -0.125)))
    lay(yaw=-48, spin=180)
    frame(cam, parts, elev=30, azim=-10, lens=55, margin=1.0)
    render(os.path.join(OUT, "preview_torcia_montata.png"))
    restore(parts, snap)
    for k in ("pila_a", "pila_b"):
        O[k].location.z -= 0.125
    O["tappo"].location.z -= 0.185
    O["tappo"].rotation_euler.z = math.radians(-35)
    O["vite"].location.z -= 0.030
    O["bottone"].location.y -= 0.012
    lay(yaw=-12, lift=0.006, spin=0)
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = 1280, 800
    frame(cam, parts, elev=26, azim=-4, lens=50, margin=0.9)
    render(os.path.join(OUT, "preview_torcia_esplosa.png"))
    sc.render.resolution_x, sc.render.resolution_y = 1024, 1024
    # inside view: cap off, looking into the tube -> green spring on cap + "2019" on the cells
    restore(parts, snap)
    O["tappo"].location.z -= 0.07
    O["tappo"].location.x += 0.05
    O["tappo"].rotation_euler.y = math.radians(-70)
    lay(yaw=55, spin=0)
    frame(cam, parts, elev=22, azim=-30, lens=60, margin=0.95)
    render(os.path.join(OUT, "preview_torcia_tappo_aperto.png"))

if __name__ == "__main__":
    r = build()
    export("torcia.glb", r)
    if RENDER:
        previews(r)
