"""
La Bottega - torcia (flashlight) asset. Source of truth.
Run:  /opt/blender/blender -b -P torcia.py -- [--no-render] [--samples N]
Builds the torch procedurally, exports out/torcia.glb (glTF Y-up, metres,
same unscaled units as src/gioco/scena.js costruisciTorcia: game applies g.scale 1.35),
then renders previews.

Blender is Z-up: Blender Z == glTF/three.js Y (body axis). Blender -Y == three.js +Z.
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RENDER = "--no-render" not in ARGS
SAMPLES = int(ARGS[ARGS.index("--samples") + 1]) if "--samples" in ARGS else 96
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out")
os.makedirs(OUT, exist_ok=True)

SEG = 12  # radial segments for the chunky low-poly look

# ---------------------------------------------------------------- palette
PALETTE = {
    "terracotta": "#E8977C",   # torch body
    "salvia":     "#8FBFA8",   # cap, grip rings
    "oro":        "#FFE7B0",   # lens / warm light
    "miele":      "#F0B86E",   # switch, accents
    "crema":      "#FFF6EA",   # battery labels
    "acciaio":    "#A99E94",   # warm steel head
    "argento":    "#D9DDE2",   # contacts, poles, screw
    "oliva":      "#8A9A5B",   # dead battery
    "ossido":     "#6E8B4E",   # oxide spot
    "inchiostro": "#3C291C",   # darkest accent (screw recess)
    "pesca":      "#F4D2C0",   # wall / background
    "legno":      "#C4844E",   # bench wood
}

def lin(hexstr):
    h = hexstr.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (*[f(v) for v in c], 1.0)

MATS = {}
def mat(name, color, rough=0.6, metal=0.0, emission=None):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = lin(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emission:
        b.inputs["Emission Color"].default_value = lin(emission[0])
        b.inputs["Emission Strength"].default_value = emission[1]
    MATS[name] = m
    return m

def materials():
    return {
        "corpo":    mat("torcia_corpo", PALETTE["terracotta"], 0.55),
        "salvia":   mat("torcia_salvia", PALETTE["salvia"], 0.6),
        "acciaio":  mat("torcia_acciaio", PALETTE["acciaio"], 0.38, 0.55),
        "miele":    mat("torcia_miele", PALETTE["miele"], 0.45),
        "vetro":    mat("torcia_vetro", PALETTE["oro"], 0.2, 0.0),
        "argento":  mat("torcia_argento", PALETTE["argento"], 0.3, 0.75),
        "oliva":    mat("torcia_pila", PALETTE["oliva"], 0.55, 0.1),
        "crema":    mat("torcia_crema", PALETTE["crema"], 0.6),
        "ossido":   mat("torcia_ossido", PALETTE["ossido"], 0.85),
        "inchiostro": mat("torcia_inchiostro", PALETTE["inchiostro"], 0.6),
        "interno":  mat("torcia_interno", "#7A3E2C", 0.8),
    }

# ---------------------------------------------------------------- helpers
def lathe(name, profile, mats, seg=SEG, smooth_angle=40, offset=(0, 0, 0)):
    """profile: list of (r, z, mat_index_of_segment_starting_here).
    Points with r == 0 close the surface with a fan. Normals outward when the
    profile runs bottom->top on the outside (counter-clockwise in r,z)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for (r, z, _) in profile:
        if r == 0:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / seg),
                                        r * math.sin(2 * math.pi * i / seg), z))
                          for i in range(seg)])
    for k in range(len(rings) - 1):
        a, b = rings[k], rings[k + 1]
        mi = profile[k][2]
        for i in range(seg):
            j = (i + 1) % seg
            if len(a) == 1:
                f = bm.faces.new((a[0], b[i], b[j]))
            elif len(b) == 1:
                f = bm.faces.new((a[i], b[0], a[j])) if False else bm.faces.new((a[i], a[j], b[0]))
            else:
                f = bm.faces.new((a[i], a[j], b[j], b[i]))
            f.material_index = mi
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    for m in mats:
        me.materials.append(m)
    ob.location = offset
    smooth(ob, smooth_angle)
    return ob

def smooth(ob, angle):
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))

def join(target, others):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in others:
        o.select_set(True)
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.join()
    return target

def set_origin(ob, point):
    """Move object origin to world point without moving geometry."""
    p = Vector(point)
    ob.data.transform(Matrix.Translation(-(p - ob.location)))
    ob.location = p
    bpy.context.view_layer.update()

def rounded_box(name, size, bevel, mat_, segments=1):
    bpy.ops.mesh.primitive_cube_add(size=1)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    md = ob.modifiers.new("b", "BEVEL")
    md.width = bevel
    md.segments = segments
    bpy.ops.object.modifier_apply(modifier="b")
    ob.data.materials.append(mat_)
    smooth(ob, 35)
    return ob

# ---------------------------------------------------------------- build
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M = materials()

    root = bpy.data.objects.new("torcia", None)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.05
    bpy.context.collection.objects.link(root)

    # --- corpo: tube + head/reflector, hollow battery bay open at the bottom
    # mats: 0 body, 1 steel head, 2 interior
    R = 0.043
    corpo = lathe("corpo", [
        (0.0,    0.0955, 2),   # inner ceiling (faces down into the bay)
        (0.0355, 0.0955, 2),
        (0.0355, 0.0300, 0),   # inner wall down to the rim
        (0.0400, 0.0300, 0),   # rim (thread seat, cap meets here)
        (R,      0.0330, 0),   # chamfer
        (R,      0.1880, 0),
        (0.0455, 0.1940, 1),   # start of steel head
        (0.0540, 0.2260, 1),   # reflector flare
        (0.0570, 0.2320, 3),
        (0.0570, 0.2440, 3),   # bezel (honey ring)
        (0.0540, 0.2500, 3),
        (0.0450, 0.2500, 3),   # bezel lip, lens sits inside
        (0.0450, 0.2470, 1),
        (0.0,    0.2470, 1),
    ], [M["corpo"], M["acciaio"], M["interno"], M["miele"]])
    # inner surfaces must face inward: the lathe ran inside-out for the bay part,
    # recalc_face_normals already made the closed shell consistent (manifold).

    # grip rings (salvia), slightly proud of the body
    rings = []
    for zc in (0.070, 0.165):
        rings.append(lathe("ring", [
            (R - 0.001, zc - 0.007, 0), (R + 0.0025, zc - 0.005, 0),
            (R + 0.0025, zc + 0.005, 0), (R - 0.001, zc + 0.007, 0),
        ], [M["salvia"]], smooth_angle=60))
    # make rings closed tubes: add inner side so they are manifold-ish (hidden by body)
    # switch button (miele) on the -Y side (faces the camera's +Z in three.js)
    sw_base = rounded_box("sw_base", (0.020, 0.012, 0.034), 0.004, M["salvia"], 2)
    sw_base.location = (0, -(R - 0.001), 0.118)
    sw = rounded_box("sw", (0.012, 0.010, 0.022), 0.0035, M["miele"], 2)
    sw.location = (0, -(R + 0.004), 0.120)
    join(corpo, rings + [sw_base, sw])
    corpo.location = (0, 0, 0)

    # --- vetro: domed lens (game drives emissive on it)
    vetro = lathe("vetro", [
        (0.0,    0.2470, 0), (0.0455, 0.2470, 0), (0.0455, 0.2490, 0),
        (0.034,  0.2525, 0), (0.018, 0.2545, 0), (0.0, 0.2550, 0),
    ], [M["vetro"]], smooth_angle=50)
    vetro.parent = corpo

    # --- tappo (bottom cap). Origin on body axis at the thread seat z=0.03.
    tappo = lathe("tappo", [
        (0.0,    0.0000, 0),
        (0.0400, 0.0000, 0),
        (0.0450, 0.0045, 0),
        (0.0450, 0.0260, 0),
        (0.0420, 0.0298, 0),   # small gap to body rim (0.0300) -> no coplanar faces
        (0.0335, 0.0298, 1),   # threaded neck (hidden when assembled)
        (0.0350, 0.0330, 1),
        (0.0335, 0.0360, 1),
        (0.0350, 0.0390, 1),
        (0.0335, 0.0420, 1),
        (0.0,    0.0420, 1),
    ], [M["salvia"], M["acciaio"]])
    # knurl bumps around the cap for a toy grip read
    bumps = []
    for i in range(SEG):
        a = 2 * math.pi * (i + 0.5) / SEG
        b = rounded_box("bump", (0.005, 0.007, 0.016), 0.0016, M["salvia"], 1)
        b.location = (0.0448 * math.cos(a), 0.0448 * math.sin(a), 0.0152)
        b.rotation_euler = (0, 0, a)
        bumps.append(b)
    join(tappo, bumps)
    set_origin(tappo, (0, 0, 0.030))

    # --- macchia: oxide spot on the cap bottom (game: lens target, recolored)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.0095)
    macchia = bpy.context.active_object
    macchia.name = "macchia"
    macchia.data.name = "macchia"
    macchia.scale = (1.0, 0.8, 0.28)
    macchia.location = (0.024, -0.010, 0.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    macchia.data.materials.append(M["ossido"])
    bpy.context.view_layer.update()
    smooth(macchia, 80)

    # --- vite: central screw on the cap bottom, axis = body axis
    vite = lathe("vite", [
        (0.0,    -0.0040, 0),
        (0.0070, -0.0037, 0),
        (0.0105, -0.0025, 0),
        (0.0115, -0.0005, 0),
        (0.0115,  0.0010, 0),
        (0.0045,  0.0010, 0),   # shank with thread ridges (hidden inside cap)
        (0.0050,  0.0060, 0),
        (0.0040,  0.0090, 0),
        (0.0050,  0.0120, 0),
        (0.0040,  0.0150, 0),
        (0.0025,  0.0180, 0),
        (0.0,     0.0185, 0),
    ], [M["argento"]], seg=10, smooth_angle=45)
    # phillips recess: boolean a cross out of the dome (one cutter per arm)
    for sx, sy in ((0.016, 0.0032), (0.0032, 0.016)):
        c = rounded_box("cut", (sx, sy, 0.006), 0.0005, M["inchiostro"], 1)
        c.location = (0, 0, -0.0050)
        md = vite.modifiers.new("x", "BOOLEAN")
        md.operation = "DIFFERENCE"
        md.solver = "EXACT"
        md.object = c
        md.material_mode = "TRANSFER"
        bpy.context.view_layer.objects.active = vite
        bpy.ops.object.modifier_apply(modifier="x")
        bpy.data.objects.remove(c)
    smooth(vite, 30)
    set_origin(vite, (0, 0, -0.0015))  # head centre on axis

    # --- pile: two cells side by side (game: sede_a x=-0.016, sede_b x=+0.016)
    def pila(name, x):
        p = lathe(name, [
            (0.0,    -0.0230, 2),
            (0.0110, -0.0230, 0),
            (0.0130, -0.0210, 0),
            (0.0130,  0.0080, 1),   # cream label band
            (0.0130,  0.0170, 0),
            (0.0130,  0.0210, 0),
            (0.0110,  0.0230, 2),
            (0.0050,  0.0230, 2),   # + pole
            (0.0050,  0.0280, 2),
            (0.0,     0.0280, 2),
        ], [M["oliva"], M["crema"], M["argento"]], seg=10, smooth_angle=50)
        p.location = (x, 0, 0.060)
        return p
    pila_a = pila("pila_a", -0.016)
    pila_b = pila("pila_b", 0.016)

    # --- contatto: plate + two little springs under the bay ceiling
    contatto = lathe("contatto", [
        (0.0,   0.0905, 0), (0.030, 0.0905, 0), (0.031, 0.0920, 0),
        (0.031, 0.0935, 0), (0.0, 0.0935, 0),
    ], [M["argento"]], smooth_angle=60)
    springs = []
    for x in (-0.016, 0.016):
        s = lathe("molla", [
            (0.0,   0.0882, 0), (0.0045, 0.0882, 0), (0.0060, 0.0890, 0),
            (0.0045, 0.0897, 0), (0.0060, 0.0905, 0), (0.0, 0.0905, 0),
        ], [M["argento"]], seg=8, smooth_angle=60)
        s.location = (x, 0, 0)
        springs.append(s)
    join(contatto, springs)
    set_origin(contatto, (0, 0, 0.0935))  # seat = under the bay ceiling

    # --- hierarchy
    bpy.context.view_layer.update()
    for ob in (corpo, tappo, contatto, pila_a, pila_b):
        mw = ob.matrix_world.copy()
        ob.parent = root
        ob.matrix_world = mw
    for ob in (macchia, vite):
        mw = ob.matrix_world.copy()
        ob.parent = tappo
        ob.matrix_parent_inverse = tappo.matrix_world.inverted()
        ob.matrix_world = mw
    vetro.matrix_parent_inverse = Matrix()
    # helper empties the game already uses
    for name, loc in (("sede_a", (-0.016, 0, 0.060)), ("sede_b", (0.016, 0, 0.060)),
                      ("centro_torcia", (0, 0, 0.120))):
        e = bpy.data.objects.new(name, None)
        e.empty_display_size = 0.01
        bpy.context.collection.objects.link(e)
        e.parent = root
        e.location = loc
    bpy.context.view_layer.update()
    return root

# ---------------------------------------------------------------- export
def bake_parent_inverses():
    bpy.context.view_layer.update()
    for ob in bpy.data.objects:
        if ob.parent:
            mw = ob.matrix_world.copy()
            ob.matrix_parent_inverse = Matrix()
            ob.matrix_world = mw

def export():
    bake_parent_inverses()
    bpy.ops.object.select_all(action="DESELECT")
    path = os.path.join(OUT, "torcia.glb")
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", export_yup=True, export_apply=True,
        export_draco_mesh_compression_enable=False, export_materials="EXPORT",
        export_extras=False, export_lights=False, export_cameras=False,
    )
    print("EXPORTED", path, os.path.getsize(path))

# ---------------------------------------------------------------- render
def setup_render():
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.render.resolution_x = 1024
    sc.render.resolution_y = 1024
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = 0.0
    sc.render.film_transparent = True  # composited on the warm backdrop by make_board.py / composite()
    sc.unit_settings.scale_length = 1.0
    world = bpy.data.worlds.new("w")
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = lin("#F4D2C0")
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.15
    # warm floor (backdrop sweep) so contact shadow grounds the object
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    floor = bpy.context.active_object
    floor.name = "_floor"
    floor.data.materials.append(mat("_floor", "#F1CDB8", 0.9))
    floor.is_shadow_catcher = True
    # 3-point warm rig (mirrors game: warm key from upper right, peach fill, rim)
    def area(name, loc, energy, color, size):
        l = bpy.data.lights.new(name, "AREA")
        l.energy = energy
        l.color = lin(color)[:3]
        l.size = size
        o = bpy.data.objects.new(name, l)
        bpy.context.collection.objects.link(o)
        o.location = loc
        d = Vector((0, 0, 0.08)) - Vector(loc)
        o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        return o
    area("key", (0.55, -0.55, 0.75), 8, "#FFD59A", 0.7)
    area("fill", (-0.7, -0.35, 0.35), 5, "#FFE9DA", 0.9)
    area("rim", (-0.2, 0.7, 0.5), 12, "#FFF1D6", 0.3)
    cam = bpy.data.cameras.new("cam")
    cam.lens = 70
    co = bpy.data.objects.new("cam", cam)
    bpy.context.collection.objects.link(co)
    sc.camera = co
    return co, floor

def frame(cam, objs, elev, azim, lens, margin=1.15, aim_offset=(0, 0, 0)):
    """Place camera on a sphere around the objects' world bbox."""
    bpy.context.view_layer.update()
    pts = []
    for o in objs:
        if o.type == "MESH":
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    c = (lo + hi) / 2 + Vector(aim_offset)
    r = (hi - lo).length / 2
    cam.data.lens = lens
    fov = 2 * math.atan(18 / lens)
    d = r * margin / math.sin(fov / 2)
    e, a = math.radians(elev), math.radians(azim)
    loc = c + d * Vector((math.cos(e) * math.sin(a), -math.cos(e) * math.cos(a), math.sin(e)))
    cam.location = loc
    cam.rotation_euler = (c - loc).to_track_quat("-Z", "Y").to_euler()

def render(name):
    p = os.path.join(OUT, f"preview_torcia_{name}.png")
    bpy.context.scene.render.filepath = p
    bpy.ops.render.render(write_still=True)
    composite(p)
    print("RENDERED", p)

def composite(p):
    """Put the transparent render (object + caught shadow) on a warm peach backdrop."""
    import numpy as np
    img = bpy.data.images.load(p)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)  # sRGB, straight alpha
    hexrgb = lambda hx: np.array([int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]       # row 0 = bottom
    bg = hexrgb("#EFC9B4") * (1 - t) + hexrgb("#F8E3D5") * t
    a = px[..., 3:4].copy()
    # caught shadow = dark, semi-transparent pixels: soften and warm it
    lum = px[..., :3].mean(axis=2, keepdims=True)
    shadow = (a < 0.985) & (lum < 0.06)
    a = np.where(shadow, a * 0.62, a)
    warm = hexrgb("#7A4A3A")
    rgb = np.where(shadow, warm, px[..., :3])
    px[..., :3] = rgb * a + bg * (1 - a)
    px[..., 3] = 1.0
    img.pixels = px.ravel().tolist()
    img.save()
    bpy.data.images.remove(img)

def previews(root):
    cam, floor = setup_render()
    O = {o.name: o for o in bpy.data.objects}
    parts = [o for o in root.children_recursive if o.type == "MESH"]
    # lying on the bench: body axis horizontal (world +X = towards the head)
    def lay(yaw, lift=0.0, spin=0.0):
        root.matrix_world = (Matrix.Translation((0, 0, 0.0452 + lift))
                             @ Matrix.Rotation(math.radians(yaw), 4, "Z")
                             @ Matrix.Rotation(math.radians(90), 4, "Y")
                             @ Matrix.Rotation(math.radians(spin), 4, "Z")
                             @ Matrix.Translation((0, 0, -0.125)))
    home = {o.name: (o.location.copy(), o.rotation_euler.copy()) for o in parts}
    def reset():
        for o in parts:
            o.location, o.rotation_euler = home[o.name][0].copy(), home[o.name][1].copy()
    # (a) assembled 3/4: lens turned towards the viewer
    lay(yaw=-48, spin=180)
    frame(cam, parts, elev=30, azim=-10, lens=55, margin=1.0)
    render("montata")
    # (b) exploded along the body axis (local -Z of the torch = towards the tail)
    reset()
    O["contatto"].location.z -= 0.075                   # out of the bay mouth
    for k in ("pila_a", "pila_b"):
        O[k].location.z -= 0.125
    O["tappo"].location.z -= 0.175
    O["tappo"].rotation_euler.z = math.radians(-35)    # unscrew = CCW seen from the tail
    O["vite"].location.z -= 0.030                       # vite is a child of tappo
    lay(yaw=-12, lift=0.006, spin=0)
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = 1280, 800
    frame(cam, parts, elev=26, azim=-4, lens=50, margin=0.9)
    render("esplosa")
    sc.render.resolution_x, sc.render.resolution_y = 1024, 1024
    # (c) close-up: tail end, cap backed off a little, screw on the axis
    reset()
    O["tappo"].location.z -= 0.016
    O["tappo"].rotation_euler.z = math.radians(-20)
    O["vite"].location.z -= 0.010
    lay(yaw=40, spin=0)
    frame(cam, [O["tappo"], O["vite"], O["macchia"]], elev=24, azim=-22, lens=70, margin=1.5)
    render("fondo_vite")

if __name__ == "__main__":
    r = build()
    export()
    if RENDER:
        previews(r)
