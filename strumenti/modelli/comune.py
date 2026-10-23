"""
La Bottega - shared Blender helpers, palette and SHARED materials for the whole asset set.
Imported by torcia.py, telecomando.py, banco.py, attrezzi/*.py.

Draw-call strategy (budget: whole scene < 50 draw calls, < 40k tris):
  * colours live in a per-corner colour attribute "Col" (glTF COLOR_0), NOT in materials;
  * every asset uses the same two shared materials:
        bottega_opaco    (plastic / wood / cloth / paper, rough 0.62, metal 0)
        bottega_metallo  (steel / silver / copper,        rough 0.35, metal 0.7)
    -> a mesh is 1 draw call (2 if it mixes opaco + metallo faces);
  * only parts whose colour the game animates get their own flat material
    (torcia_vetro emissive, torcia_ossido, torcia_contatto) plus the magnifier glass.
three.js: GLTFLoader turns COLOR_0 into material.vertexColors = true automatically.
Blender is Z-up: Blender Z == three.js Y, Blender -Y == three.js +Z (towards the camera).
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
RENDER = "--no-render" not in ARGS
SAMPLES = int(ARGS[ARGS.index("--samples") + 1]) if "--samples" in ARGS else 64
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "out")
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- palette (stile.md)
PAL = {
    "terracotta": "#E8977C", "salvia": "#8FBFA8", "oro": "#FFE7B0", "miele": "#F0B86E",
    "crema": "#FFF6EA", "acciaio": "#A99E94", "argento": "#D9DDE2", "oliva": "#8A9A5B",
    "ossido": "#6E8B4E", "inchiostro": "#3C291C", "pesca": "#F4D2C0", "legno": "#C4844E",
    "interno": "#7A3E2C",
    # additions for set 1 (documented in stile.md)
    "legno_scuro": "#9A5F38",   # bench legs, plank gaps
    "legno_chiaro": "#D29A62",  # alternate bench planks
    "foglia": "#93C47D",        # NEW batteries (vs dead oliva)
    "rame": "#D08A3A",          # bare copper wire
    "rosso": "#C4623A",         # wire insulation, ON button
    "carta": "#E9D9BE",         # tape core, cardboard
    "grafite": "#5A4A40",       # IR window, rubber, wire insulation
    "nocciola": "#6B4E3D",      # remote shell (dark, so pastel buttons pop)
}
METALLIC = {"acciaio", "argento", "rame"}

def lin(hexstr):
    h = hexstr.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (*[f(v) for v in c], 1.0)

# ---------------------------------------------------------------- materials
MATS = {}
def mat_vc(name, rough, metal):
    """Shared material: base colour = colour attribute 'Col' (exported as COLOR_0)."""
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    ca = nt.nodes.new("ShaderNodeVertexColor")
    ca.layer_name = "Col"
    nt.links.new(ca.outputs["Color"], b.inputs["Base Color"])
    MATS[name] = m
    return m

def mat_flat(name, color, rough=0.6, metal=0.0, emission=None, alpha=None):
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
    if alpha is not None:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND"
    MATS[name] = m
    return m

def OPACO():   return mat_vc("bottega_opaco", 0.62, 0.0)
def METALLO(): return mat_vc("bottega_metallo", 0.35, 0.7)

def ensure_slots(me):
    """Slot 0 = opaco, slot 1 = metallo (same order on every vc mesh so join() merges cleanly)."""
    if len(me.materials) == 0:
        me.materials.append(OPACO())
        me.materials.append(METALLO())

def paint(ob, key, as_mat=None, faces=None):
    """Colour faces with palette key; material slot from key (metal keys -> metallo) unless as_mat."""
    me = ob.data
    ensure_slots(me)
    if "Col" not in me.color_attributes:
        me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
    att = me.color_attributes["Col"]
    col = lin(PAL[key]) if key in PAL else lin(key)
    slot = {"opaco": 0, "metallo": 1}[as_mat] if as_mat else (1 if key in METALLIC else 0)
    for p in me.polygons:
        if faces is not None and p.index not in faces:
            continue
        p.material_index = slot
        for li in p.loop_indices:
            att.data[li].color = col
    return ob

def flat(ob, material):
    for a in list(ob.data.color_attributes):
        ob.data.color_attributes.remove(a)
    ob.data.materials.clear()
    ob.data.materials.append(material)
    for p in ob.data.polygons:
        p.material_index = 0
    return ob

# ---------------------------------------------------------------- geometry helpers
def link(ob):
    bpy.context.collection.objects.link(ob)
    return ob

def empty(name, loc=(0, 0, 0), parent=None, size=0.01, rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = size
    link(e)
    if parent:
        e.parent = parent
    e.location = loc
    e.rotation_euler = rot
    bpy.context.view_layer.update()
    return e

def smooth(ob, angle):
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle))
    return ob

def lathe(name, profile, seg=12, smooth_angle=40, as_mat=None):
    """profile: list of (r, z, colour_key) - key colours the band starting at that point.
    r == 0 closes with a fan. Normals recalculated outward."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for (r, z, _) in profile:
        if r == 0:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / seg),
                                        r * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)])
    keys = []
    for k in range(len(rings) - 1):
        a, b = rings[k], rings[k + 1]
        for i in range(seg):
            j = (i + 1) % seg
            if len(a) == 1:
                f = bm.faces.new((a[0], b[i], b[j]))
            elif len(b) == 1:
                f = bm.faces.new((a[i], a[j], b[0]))
            else:
                f = bm.faces.new((a[i], a[j], b[j], b[i]))
            keys.append(profile[k][2])
    bm.faces.ensure_lookup_table()
    lay = bm.faces.layers.int.new("k")
    uniq = sorted(set(keys))
    for f, kk in zip(bm.faces, keys):
        f[lay] = uniq.index(kk)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    idx = [f[lay] for f in bm.faces]
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me))
    for u, kk in enumerate(uniq):
        paint(ob, kk, as_mat, faces={i for i, v in enumerate(idx) if v == u})
    if "k" in me.attributes:
        me.attributes.remove(me.attributes["k"])
    smooth(ob, smooth_angle)
    return ob

def box(name, size, bevel, key, segments=1, loc=(0, 0, 0), rot=(0, 0, 0), as_mat=None, smooth_angle=35):
    bpy.ops.mesh.primitive_cube_add(size=1)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        md = ob.modifiers.new("b", "BEVEL")
        md.width = bevel
        md.segments = segments
        md.limit_method = "NONE"
        bpy.ops.object.modifier_apply(modifier="b")
    ob.location = loc
    ob.rotation_euler = rot
    paint(ob, key, as_mat)
    smooth(ob, smooth_angle)
    bpy.context.view_layer.update()
    return ob

def cyl(name, r, depth, key, seg=10, loc=(0, 0, 0), rot=(0, 0, 0), as_mat=None, bevel=0.0, smooth_angle=40):
    """Cylinder along local Z, centred; optional chamfer via lathe profile."""
    h = depth / 2
    if bevel > 0:
        prof = [(0, -h, key), (r - bevel, -h, key), (r, -h + bevel, key), (r, h - bevel, key),
                (r - bevel, h, key), (0, h, key)]
    else:
        prof = [(0, -h, key), (r, -h, key), (r, h, key), (0, h, key)]
    ob = lathe(name, prof, seg=seg, smooth_angle=smooth_angle, as_mat=as_mat)
    ob.location = loc
    ob.rotation_euler = rot
    bpy.context.view_layer.update()
    return ob

def helix(name, r, length, turns, wire, key, seg_turn=8, sides=4, as_mat=None, taper=1.0):
    """Coil spring along local +Z from z=0 to z=length (curve -> mesh)."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = wire
    cu.bevel_resolution = max(0, sides // 2 - 2)
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    n = int(turns * seg_turn) + 1
    sp.points.add(n - 1)
    for i in range(n):
        t = i / (n - 1)
        rr = r * (1 + (taper - 1) * t)
        a = 2 * math.pi * turns * t
        sp.points[i].co = (rr * math.cos(a), rr * math.sin(a), length * t, 1)
    ob = link(bpy.data.objects.new(name, cu))
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.active_object
    ob.name = name
    paint(ob, key, as_mat)
    smooth(ob, 60)
    return ob

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"   # DejaVu licence (free, Bitstream Vera based)

def text_mesh(name, body, size, depth, key, as_mat=None):
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = body
    cu.size = size
    cu.extrude = depth / 2
    cu.resolution_u = 2
    cu.align_x = "CENTER"
    cu.align_y = "CENTER"
    if os.path.exists(FONT):
        cu.font = bpy.data.fonts.load(FONT, check_existing=True)
    ob = link(bpy.data.objects.new(name, cu))
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.active_object
    ob.name = name
    me = ob.data
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=size * 0.004)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(4), verts=bm.verts, edges=bm.edges)
    bm.to_mesh(me); bm.free()
    paint(ob, key, as_mat)
    return ob

def boolean(ob, cutter, op="DIFFERENCE", keep=False):
    md = ob.modifiers.new("x", "BOOLEAN")
    md.operation = op
    md.solver = "EXACT"
    md.object = cutter
    md.material_mode = "TRANSFER"
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier="x")
    if not keep:
        bpy.data.objects.remove(cutter)
    return ob

def join(target, others):
    others = [o for o in others if o is not None]
    if not others:
        return target
    bpy.context.view_layer.update()
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in others:
        o.select_set(True)
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.join()
    return target

def apply_tf(ob, loc=True, rot=True, scale=True):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(location=loc, rotation=rot, scale=scale)
    bpy.context.view_layer.update()
    return ob

def set_origin(ob, point):
    """Move object origin to WORLD point without moving geometry (object must be unparented, unrotated)."""
    bpy.context.view_layer.update()
    p = Vector(point)
    ob.data.transform(Matrix.Translation(-(p - ob.location)))
    ob.location = p
    bpy.context.view_layer.update()
    return ob

def parent_keep(child, parent):
    bpy.context.view_layer.update()
    mw = child.matrix_world.copy()
    child.parent = parent
    child.matrix_parent_inverse = Matrix()
    child.matrix_world = mw
    bpy.context.view_layer.update()
    return child

def drop_unused_slots(ob):
    """Remove material slots no face uses -> no empty primitives / extra draw calls."""
    me = ob.data
    used = sorted({p.material_index for p in me.polygons})
    if len(used) == len(me.materials):
        return ob
    remap = {old: new for new, old in enumerate(used)}
    mats = [me.materials[i] for i in used]
    for p in me.polygons:
        p.material_index = remap[p.material_index]
    me.materials.clear()
    for m in mats:
        me.materials.append(m)
    return ob

def tidy(root):
    for ob in [root] + list(root.children_recursive):
        if ob.type == "MESH":
            drop_unused_slots(ob)
            for uv in list(ob.data.uv_layers):
                ob.data.uv_layers.remove(uv)
            for a in list(ob.data.color_attributes):
                if a.name != "Col":
                    ob.data.color_attributes.remove(a)
            if ob.data.name != ob.name:
                ob.data.name = ob.name

def new_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()

# ---------------------------------------------------------------- export
def bake_parent_inverses():
    bpy.context.view_layer.update()
    for ob in bpy.data.objects:
        if ob.parent:
            mw = ob.matrix_world.copy()
            ob.matrix_parent_inverse = Matrix()
            ob.matrix_world = mw
    bpy.context.view_layer.update()

def export(fname, root):
    tidy(root)
    bake_parent_inverses()
    for o in bpy.context.selected_objects:
        o.select_set(False)
    keep = [root] + list(root.children_recursive)
    for o in keep:
        o.select_set(True)
    path = os.path.join(OUT, fname)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", export_yup=True, export_apply=True,
        use_selection=True, export_draco_mesh_compression_enable=False,
        export_materials="EXPORT", export_vertex_color="MATERIAL",
        export_extras=False, export_lights=False, export_cameras=False,
    )
    print("EXPORTED", path, os.path.getsize(path))
    return path

# ---------------------------------------------------------------- render
def setup_render(res=(1024, 1024)):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.film_transparent = True
    world = bpy.data.worlds.new("w")
    sc.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = lin("#F4D2C0")
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.15
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    floor = bpy.context.active_object
    floor.name = "_floor"
    floor.data.materials.append(mat_flat("_floor", "#F1CDB8", 0.9))
    floor.is_shadow_catcher = True
    def area(name, loc, energy, color, size):
        l = bpy.data.lights.new(name, "AREA")
        l.energy, l.color, l.size = energy, lin(color)[:3], size
        o = link(bpy.data.objects.new(name, l))
        o.location = loc
        o.rotation_euler = (Vector((0, 0, 0.08)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        return o
    area("_key", (0.55, -0.55, 0.75), 8, "#FFD59A", 0.7)
    area("_fill", (-0.7, -0.35, 0.35), 5, "#FFE9DA", 0.9)
    area("_rim", (-0.2, 0.7, 0.5), 12, "#FFF1D6", 0.3)
    cam = bpy.data.cameras.new("cam")
    co = link(bpy.data.objects.new("_cam", cam))
    sc.camera = co
    return co, floor

def mesh_points(objs):
    bpy.context.view_layer.update()
    pts = []
    for o in objs:
        if o.type == "MESH" and o.visible_get():
            pts += [o.matrix_world @ Vector(c) for c in o.bound_box]
    return pts

def frame(cam, objs, elev, azim, lens, margin=1.15, aim_offset=(0, 0, 0)):
    pts = mesh_points(objs)
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    c = (lo + hi) / 2 + Vector(aim_offset)
    r = (hi - lo).length / 2
    cam.data.lens = lens
    sc = bpy.context.scene
    aspect = sc.render.resolution_x / sc.render.resolution_y
    fov = 2 * math.atan(18 / lens) * (1 if aspect >= 1 else aspect)
    d = r * margin / math.sin(fov / 2)
    e, a = math.radians(elev), math.radians(azim)
    loc = c + d * Vector((math.cos(e) * math.sin(a), -math.cos(e) * math.cos(a), math.sin(e)))
    cam.location = loc
    cam.rotation_euler = (c - loc).to_track_quat("-Z", "Y").to_euler()

def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    composite(path)
    print("RENDERED", path)

def composite(p):
    import numpy as np
    img = bpy.data.images.load(p)
    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    hexrgb = lambda hx: np.array([int(hx[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    bg = hexrgb("#EFC9B4") * (1 - t) + hexrgb("#F8E3D5") * t
    a = px[..., 3:4].copy()
    lum = px[..., :3].mean(axis=2, keepdims=True)
    shadow = (a < 0.985) & (lum < 0.06)
    a = np.where(shadow, a * 0.62, a)
    rgb = np.where(shadow, hexrgb("#7A4A3A"), px[..., :3])
    px[..., :3] = rgb * a + bg * (1 - a)
    px[..., 3] = 1.0
    img.pixels = px.ravel().tolist()
    img.save()
    bpy.data.images.remove(img)

def snapshot(objs):
    return {o.name: (o.location.copy(), o.rotation_euler.copy(), o.scale.copy()) for o in objs}

def restore(objs, snap):
    for o in objs:
        o.location, o.rotation_euler, o.scale = (v.copy() for v in snap[o.name])
    bpy.context.view_layer.update()

# ---------------------------------------------------------------- tools helpers
def loft(name, stations, key, as_mat=None, smooth_angle=35, chamfer=0.3):
    """Rectangular (chamfered, 8-vert) sections along local Z.
    stations: (z, cx, hx, hy) -> section centred at (cx, 0, z) with half sizes hx, hy."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for (z, cx, hx, hy) in stations:
        cxh, cyh = hx * chamfer, hy * chamfer
        sec = [(hx, -hy + cyh), (hx, hy - cyh), (hx - cxh, hy), (-hx + cxh, hy),
               (-hx, hy - cyh), (-hx, -hy + cyh), (-hx + cxh, -hy), (hx - cxh, -hy)]
        rings.append([bm.verts.new((cx + x, y, z)) for x, y in sec])
    n = 8
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me))
    paint(ob, key, as_mat)
    smooth(ob, smooth_angle)
    return ob

def ground(root):
    """Translate root so its lowest mesh point touches z=0."""
    bpy.context.view_layer.update()
    pts = mesh_points([o for o in root.children_recursive if o.type == "MESH"])
    root.location.z -= min(p.z for p in pts)
    bpy.context.view_layer.update()

def preview_tool(root, path, rot, elev=38, azim=-18, lens=60, margin=1.08, res=(1024, 768), spin=0.0, mode="XYZ"):
    root.rotation_mode = mode
    root.rotation_euler = rot
    bpy.context.view_layer.update()
    root.matrix_world = Matrix.Rotation(math.radians(spin), 4, "Z") @ root.matrix_world
    ground(root)
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    frame(sc.camera, [o for o in root.children_recursive if o.type == "MESH"], elev, azim, lens, margin)
    render(path)
