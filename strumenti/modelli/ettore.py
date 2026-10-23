"""
La Bottega - Maestro Ettore, il vecchio riparatore (personaggio originale). v2: una sola SkinnedMesh.
Run: /opt/blender/blender -b -P ettore.py -- [--no-render] [--samples N]

Unita': quelle del set NON scalate (il gioco applica x1.35). Origine di `ettore` = piano del panno.
Fronte verso three.js +Z (Blender -Y). Sinistra di Ettore (sx) = +X.
v2:
- una mesh (`ettore_mesh`), un materiale (bottega_opaco), colori + AO nei vertici, pesi rigidi
  (ogni vertice al 100% sull'osso della sua parte);
- armatura `ettore` (nodo radice) con ossa tutte verticali e roll 0: in glTF/three.js ogni osso ha
  rotazione di riposo identita', quindi gli assi locali di ogni osso sono quelli di Ettore
  (X = sua sinistra, Y = su, Z = avanti);
- gomiti (`avambraccio_*`), palpebre che sbattono (`palpebre`, scala Y: 1 = aperte, 2 = chiuse);
- 4 clip glTF: giornale_su, spinta_dito, mano_occhi, sbattere.
"""
import bpy, bmesh, math, os, sys, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *
from mathutils import Vector, Matrix, Euler, Quaternion

S = 1.35
C = {
    "pelle": "#EBC3A6", "naso": "#EBC3A6", "guance": "#E8977C", "pelo": "#FFF6EA",
    "coppola": "#6B4E3D", "coppola_scuro": "#5A4134", "occhiali": "#6B4E3D", "camicia": "#6F9E88",
    "camicia_ombra": "#5F8E78", "grembiule": "#9A5F38", "grembiule_bordo": "#86512F",
    "pantaloni": "#5A4A40", "scarpe": "#6B4E3D", "occhi": "#3C291C", "luce": "#FFF6EA",
    "carta": "#E9D9BE", "palpebra": "#E3A98A", "foto": "#8FBFA8", "carta_chiara": "#F3E8D4", "inchiostro": "#D2BEA4", "titolo": "#3C291C",
    "matita": "#F0B86E", "mina": "#5A4A40", "legno": "#D29A62",
}
HZ = 0.305                      # head centre
HA, HB, HC = 0.088, 0.078, 0.066  # head radii x, y(depth), z
SH = (0.112, 0.0, 0.200)        # left shoulder pivot (right = mirrored)
ARM_L = 0.156                   # shoulder -> wrist (v2: +1 cm of forearm, for the gestures)

# ------------------------------------------------------------------ primitives
def ell(name, r, key, loc=(0, 0, 0), rot=(0, 0, 0), seg=10, rings=6, sm=70):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=1)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = r
    ob.rotation_euler = rot
    ob.location = loc
    apply_tf(ob)
    paint(ob, C.get(key, key))
    smooth(ob, sm)
    return ob

def tor(name, R, r, key, loc, rot, seg=14, mseg=5):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=seg, minor_segments=mseg)
    ob = bpy.context.active_object
    ob.name = name
    ob.rotation_euler = rot
    ob.location = loc
    apply_tf(ob)
    paint(ob, C.get(key, key))
    smooth(ob, 60)
    return ob

def bx(name, size, key, loc, rot=(0, 0, 0), bevel=0.002, seg=1):
    ob = box(name, size, bevel, C.get(key, key), seg, loc=loc, rot=rot)
    apply_tf(ob)
    return ob

def cy(name, r, depth, key, loc, rot, seg=8, bevel=0.0):
    ob = cyl(name, r, depth, C.get(key, key), seg=seg, loc=loc, rot=rot, bevel=bevel)
    apply_tf(ob)
    return ob

def rev(name, rows, seg=16, ysc=1.0, theta=None, sm=50, cap=True):
    """Surface of revolution around Z. rows: (z, r, key). theta=(a0,a1) degrees measured from -Y (front)
    -> open partial surface; else closed (r==0 rows become poles)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    if theta:
        n = seg + 1
        angs = [math.radians(theta[0] + (theta[1] - theta[0]) * i / seg) for i in range(n)]
    else:
        n = seg
        angs = [2 * math.pi * i / seg for i in range(n)]
    ring = []
    for (z, r, _) in rows:
        if r == 0 and not theta:
            ring.append([bm.verts.new((0, 0, z))])
        else:
            ring.append([bm.verts.new((r * math.sin(a), -r * math.cos(a) * ysc, z)) for a in angs])
    keys = []
    for k in range(len(rows) - 1):
        a, b = ring[k], ring[k + 1]
        rng = range(n - 1) if theta else range(n)
        for i in rng:
            j = (i + 1) % n
            if len(a) == 1:
                bm.faces.new((a[0], b[j], b[i]))
            elif len(b) == 1:
                bm.faces.new((a[i], a[j], b[0]))
            else:
                bm.faces.new((a[i], a[j], b[j], b[i]))
            keys.append(rows[k][2])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me))
    for kk in set(keys):
        paint(ob, C.get(kk, kk), faces={i for i, v in enumerate(keys) if v == kk})
    smooth(ob, sm)
    return ob

def solidify(ob, t):
    md = ob.modifiers.new("s", "SOLIDIFY")
    md.thickness = t
    md.offset = 1.0
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier="s")
    return ob

def merge(name, parts):
    t = parts[0]
    join(t, parts[1:])
    t.name = name
    apply_tf(t)
    return t

def head_front(x, z):
    """Point on the front of the head ellipsoid (world coords) at given world x, z."""
    u = 1 - (x / HA) ** 2 - ((z - HZ) / HC) ** 2
    return Vector((x, -HB * math.sqrt(max(u, 0.0)), z))

def torso_r(z):
    prof = TORSO
    for (z0, r0, _), (z1, r1, _) in zip(prof, prof[1:]):
        if z0 <= z <= z1 and r0 > 0 and r1 > 0:
            return r0 + (r1 - r0) * (z - z0) / (z1 - z0)
    return 0.1

TORSO = [(-0.080, 0.000, "camicia"), (-0.080, 0.098, "camicia"), (-0.030, 0.114, "camicia"),
         (0.030, 0.122, "camicia"), (0.090, 0.117, "camicia"), (0.140, 0.106, "camicia"),
         (0.180, 0.092, "camicia"), (0.208, 0.074, "camicia"), (0.228, 0.050, "camicia"),
         (0.250, 0.036, "pelle"), (0.262, 0.000, "pelle")]
YS = 0.80   # torso depth factor

# ------------------------------------------------------------------ parts
def build_corpo():
    p = [rev("busto", TORSO, seg=18, ysc=YS, sm=60)]
    # collar
    p.append(rev("colletto", [(0.222, 0.050, "camicia_ombra"), (0.230, 0.056, "camicia_ombra"),
                              (0.246, 0.046, "camicia_ombra"), (0.240, 0.040, "camicia_ombra")], seg=16, ysc=YS))
    # apron: skirt + bib + waistband + neck strap + pocket + pencil
    sk = [(z, torso_r(min(max(z, -0.079), 0.25)) + 0.002 + max(0, -z - 0.03) * 0.20, "grembiule")
          for z in (-0.105, -0.07, -0.03, 0.0, 0.03, 0.058)]
    p.append(solidify(rev("gonna", sk, seg=12, ysc=YS, theta=(-78, 78), sm=50), 0.005))
    bib = [(z, torso_r(z) + 0.002, "grembiule") for z in (0.050, 0.090, 0.130, 0.168)]
    p.append(solidify(rev("pettorina", bib, seg=8, ysc=YS, theta=(-36, 36), sm=50), 0.005))
    band = [(0.050, torso_r(0.05) + 0.006, "grembiule_bordo"), (0.062, torso_r(0.062) + 0.006, "grembiule_bordo")]
    p.append(solidify(rev("cintura", band, seg=18, ysc=YS, sm=40), 0.003))
    # strap: from bib top corners up over the shoulders to the neck
    for s in (-1, 1):
        a = math.radians(36)
        r = torso_r(0.168) + 0.007
        x0, y0 = s * r * math.sin(a), -r * math.cos(a) * YS + 0.003
        x1, y1, z1 = s * 0.046, 0.012, 0.238
        mid = Vector(((x0 + x1) / 2, (y0 + y1) / 2 - 0.006, (0.168 + z1) / 2 + 0.004))
        d = Vector((x1 - x0, y1 - y0, z1 - 0.168))
        st = bx("bretella", (0.013, 0.006, d.length + 0.01), "grembiule", (0, 0, 0))
        st.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
        st.location = mid
        apply_tf(st)
        p.append(st)
    # bow at the back
    for s in (-1, 1):
        p.append(ell("fiocco", (0.018, 0.006, 0.010), "grembiule_bordo", (s * 0.014, torso_r(0.058) * YS + 0.008, 0.058),
                     rot=(0, s * 0.3, 0), seg=8, rings=5))
    # pocket (right side of the skirt, viewer's left) with a pencil
    px = -0.050
    pf = head_front  # placeholder to keep linters calm
    pr = torso_r(0.0) + 0.011
    pa = math.asin(px / pr)
    pocket = solidify(rev("tasca", [(-0.035, pr, "grembiule_bordo"), (0.012, pr - 0.001, "grembiule_bordo")],
                          seg=3, ysc=YS, theta=(math.degrees(pa) - 13, math.degrees(pa) + 13), sm=40), 0.004)
    p.append(pocket)
    pc = Vector((px - 0.006, -pr * math.cos(pa) * YS - 0.004, 0.022))
    p.append(cy("matita", 0.0045, 0.050, "matita", pc, (0.08, -0.25, 0), seg=6))
    tip = pc + Euler((0.08, -0.25, 0)).to_matrix() @ Vector((0, 0, 0.029))
    p.append(cy("mina", 0.0045, 0.008, "legno", tip, (0.08, -0.25, 0), seg=6))
    # legs + shoes (hidden behind the bench in game)
    for s in (-1, 1):
        p.append(cy("gamba", 0.040, 0.13, "pantaloni", (s * 0.050, 0.0, -0.135), (0, 0, 0), seg=8))
        p.append(ell("scarpa", (0.040, 0.058, 0.022), "scarpe", (s * 0.052, -0.016, -0.196), seg=8, rings=5))
    return merge("corpo", p)

def build_testa():
    p = [ell("cranio", (HA, HB, HC), "pelle", (0, 0, HZ), seg=18, rings=11, sm=80)]
    # ears
    for s in (-1, 1):
        p.append(ell("orecchio", (0.016, 0.012, 0.022), "pelle", (s * (HA - 0.002), 0.008, HZ - 0.002), seg=8, rings=5))
    # white hair tufts at the sides / back, below the cap
    for s in (-1, 1):
        p.append(ell("ciuffo", (0.022, 0.038, 0.020), "pelo", (s * 0.078, 0.024, HZ + 0.022), rot=(0.3, 0, s * 0.25), seg=8, rings=6))
    p.append(ell("nuca", (0.070, 0.030, 0.026), "pelo", (0, 0.060, HZ + 0.014), seg=10, rings=6))
    # eyes
    EZ, EX = HZ + 0.004, 0.034
    for s in (-1, 1):
        e = head_front(s * EX, EZ)
        p.append(ell("occhio", (0.0095, 0.006, 0.013), "occhi", e + Vector((0, 0.002, 0)), seg=8, rings=6))
        p.append(ell("luce", (0.003, 0.002, 0.003), "luce", e + Vector((s * 0.003 - 0.001, -0.004, 0.003)), seg=6, rings=4))
        # (upper lids: separate part `palpebre`, see build_palpebre)
        # cheeks
        c = head_front(s * 0.056, HZ - 0.022)
        p.append(ell("guancia", (0.014, 0.006, 0.009), "guance", c + Vector((0, 0.003, 0)), rot=(0, 0, s * 0.5), seg=8, rings=4))
        # round glasses
        g = e + Vector((0, -0.008, 0))
        p.append(tor("lente", 0.021, 0.0032, "occhiali", g, (math.pi / 2, 0, s * 0.18), seg=12, mseg=4))
        # temple to the ear
        tb = Vector((s * (EX + 0.021), g.y + 0.004, EZ + 0.002))
        te = Vector((s * (HA + 0.001), 0.006, EZ + 0.004))
        d = te - tb
        st = bx("asta", (0.004, d.length, 0.004), "occhiali", (0, 0, 0), bevel=0.0012)
        st.rotation_euler = (0, 0, math.atan2(-d.x, d.y))
        st.location = (tb + te) / 2
        apply_tf(st)
        p.append(st)
        # bushy eyebrows: 3 tufts, inner end low (burbero), outer tufts stick out past the glasses
        for i, (dx, dz, rx) in enumerate(((0.011, -0.003, 0.017), (0.031, 0.005, 0.019), (0.052, 0.003, 0.016))):
            q = head_front(s * (dx + 0.002), EZ + 0.026 + dz)
            p.append(ell("sopracciglio", (rx, 0.013, 0.0125), "pelo", q + Vector((0, -0.011, 0)),
                         rot=(0.30, 0, s * (-0.42 + 0.22 * i)), seg=8, rings=5))
    bridge = head_front(0, EZ) + Vector((0, -0.012, 0.004))
    p.append(cy("ponte", 0.0028, 0.030, "occhiali", bridge, (0, math.pi / 2, 0), seg=6))
    # nose (big, round)
    n = head_front(0, HZ - 0.016)
    p.append(ell("naso", (0.019, 0.017, 0.017), "naso", n + Vector((0, -0.006, 0)), seg=12, rings=8))
    # moustache: two drooping lobes + tips + middle, covers the mouth
    m = head_front(0, HZ - 0.040)
    p.append(ell("baffo_c", (0.022, 0.014, 0.014), "pelo", m + Vector((0, -0.004, 0.006)), seg=10, rings=6))
    for s in (-1, 1):
        p.append(ell("baffo", (0.030, 0.016, 0.017), "pelo", m + Vector((s * 0.024, 0.002, 0.002)),
                     rot=(0.1, s * 0.35, 0), seg=10, rings=7))
        p.append(ell("baffo_punta", (0.018, 0.012, 0.012), "pelo", m + Vector((s * 0.050, 0.012, -0.010)),
                     rot=(0, s * 0.7, 0), seg=8, rings=6))
    # vertex AO: skin and hair right under the cap edge, and under the chin (neck)
    for ob in p:
        if ob.name.split(".")[0] in ("cranio", "orecchio", "ciuffo", "nuca"):
            aofn(ob, sotto_coppola)
    ao(p[0], HZ - HC + 0.012, 0.022)
    return merge("testa", p)

def build_coppola():
    base = HZ + 0.033
    dome = rev("calotta", [(0.0, 0.000, "coppola"), (0.0, 0.086, "coppola"), (0.012, 0.094, "coppola"),
                           (0.026, 0.092, "coppola"), (0.040, 0.078, "coppola"), (0.050, 0.050, "coppola"),
                           (0.054, 0.000, "coppola")], seg=18, ysc=1.0, sm=55)
    # flat cap: top pulled forward and down at the front
    for v in dome.data.vertices:
        k = max(0.0, v.co.z) / 0.054
        v.co.y -= 0.030 * k
        if v.co.y < 0:
            v.co.z -= 0.010 * (-v.co.y / 0.09) * k
    dome.data.update()
    band = rev("fascia", [(-0.002, 0.086, "coppola_scuro"), (0.010, 0.091, "coppola_scuro")], seg=18)
    brim = ell("visiera", (0.066, 0.046, 0.007), "coppola_scuro", (0, -0.070, 0.004), rot=(-0.22, 0, 0), seg=14, rings=6, sm=60)
    btn = ell("bottone", (0.009, 0.009, 0.005), "coppola_scuro", (0, -0.022, 0.050), seg=8, rings=5)
    cp = merge("coppola", [dome, band, brim, btn])
    cp.location = (0, 0.004, base)
    cp.rotation_euler = (0.17, -0.08, 0)   # a bit back and tilted: character
    apply_tf(cp)
    return cp, Vector((0, 0.004, base))


# ------------------------------------------------------------------ v2 helpers: AO by a weight function
def smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)

def aofn(ob, f, strength=None):
    """Like comune.ao, but the darkening weight (0..1) comes from f(world_co)."""
    s = AO_MAX if strength is None else strength
    bpy.context.view_layer.update()
    me = ob.data
    att = me.color_attributes["Col"]
    mw = ob.matrix_world
    n = 0
    for p in me.polygons:
        for li in p.loop_indices:
            t = f(mw @ me.vertices[me.loops[li].vertex_index].co)
            if t <= 0:
                continue
            c = list(att.data[li].color_srgb)
            k = 1.0 - s * min(1.0, t)
            att.data[li].color_srgb = (c[0] * k, c[1] * k, c[2] * k, c[3])
            n += 1
    return n

CAP_Z = HZ + 0.033
def sotto_coppola(w):
    """Band of skin/hair just under the (tilted) cap edge."""
    edge = CAP_Z + 0.169 * (w.y - 0.004) + 0.08 * w.x
    return smoothstep((w.z - (edge - 0.026)) / 0.026)

def collo_ascelle(w):
    rxy = math.hypot(w.x, w.y / YS)
    neck = smoothstep((w.z - 0.205) / 0.045) if rxy < 0.08 else 0.0
    arm = smoothstep((abs(w.x) - 0.070) / 0.035) * smoothstep((0.205 - w.z) / 0.03) * smoothstep((w.z - 0.07) / 0.06)
    return max(neck, arm)

# ------------------------------------------------------------------ v2 parts: arm = braccio + avambraccio (elbow)
L1 = 0.064                 # shoulder -> elbow
L2 = ARM_L - L1            # elbow -> wrist

def build_braccio(s):
    rows = [(0.032, 0.0, "camicia"), (0.026, 0.024, "camicia"), (0.010, 0.036, "camicia"), (-0.040, 0.034, "camicia"),
            (-0.046, 0.038, "camicia_ombra"), (-0.068, 0.038, "camicia_ombra"), (-0.072, 0.031, "camicia_ombra"),
            (-0.075, 0.0, "camicia_ombra")]
    a = rev("braccio", list(reversed(rows)), seg=12, sm=55)
    a.location = (s * SH[0], SH[1], SH[2])
    apply_tf(a)
    # AO on the inner side of the sleeve (against the torso)
    aofn(a, lambda w: smoothstep((SH[0] - 0.006 - s * w.x) / 0.03) * smoothstep((SH[2] - 0.01 - w.z) / 0.03), 0.12)
    return a

def build_avambraccio(s):
    rows = [(-0.048, 0.0), (-0.052, 0.017), (-0.060, 0.028), (-0.072, 0.030), (-0.112, 0.028),
            (-ARM_L, 0.025), (-ARM_L - 0.006, 0.017), (-ARM_L - 0.010, 0.0)]   # end dome hidden in the palm
    f = rev("avambraccio", [(z, r, "pelle") for (z, r) in reversed(rows)], seg=12, sm=55)
    f.location = (s * SH[0], SH[1], SH[2])
    apply_tf(f)
    # a touch of AO where the forearm disappears into the rolled sleeve
    aofn(f, lambda w: smoothstep((w.z - (SH[2] - 0.084)) / 0.016), 0.10)
    return f

def build_mano(s, dito=False):
    w = Vector((s * SH[0], SH[1], SH[2] - ARM_L))
    p = [ell("palmo", (0.029, 0.020, 0.032), "pelle", w + Vector((0, 0, -0.022)), seg=10, rings=7)]
    p.append(ell("pollice", (0.010, 0.010, 0.016), "pelle", w + Vector((-s * 0.010, -0.020, -0.014)),
                 rot=(0.5, 0, 0), seg=8, rings=5))
    if dito:
        p.append(ell("indice", (0.0095, 0.0095, 0.023), "pelle", w + Vector((-s * 0.004, -0.012, -0.054)), seg=8, rings=5))
    return merge("mano_sx" if s > 0 else "mano_dx", p), w

EZ, EX = HZ + 0.004, 0.034
def build_palpebre():
    """Both heavy upper lids in one part. Pivot on the lids' top line: scale Y 1 = open (rest), ~2 = closed."""
    p = []
    for s in (-1, 1):
        e = head_front(s * EX, EZ)
        p.append(ell("palpebra", (0.0125, 0.0075, 0.0075), "palpebra", e + Vector((0, -0.0005, 0.0085)),
                     rot=(0, s * 0.22, 0), seg=8, rings=5))
    e = head_front(EX, EZ)
    return merge("palpebre", p), Vector((0, e.y, EZ + 0.0165))

def build_giornale():
    """Open tabloid, two pages in a shallow V, facing -Y. Pivot = grip on the +X edge (left hand)."""
    W, H, T = 0.105, 0.150, 0.003
    parts = []
    for side in (-1, 1):
        bm = bmesh.new()
        nx, nz = 4, 12
        vs = [[bm.verts.new((side * W * i / nx, 0.0, H * (j / nz - 0.5))) for j in range(nz + 1)] for i in range(nx + 1)]
        for i in range(nx):
            for j in range(nz):
                bm.faces.new((vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1]))
        for i in range(nx + 1):
            for j in range(nz + 1):
                vs[i][j].co.y = 0.022 * (i / nx) ** 0.9 - 0.004 * math.sin(math.pi * j / nz)
        me = bpy.data.meshes.new("pg"); bm.to_mesh(me); bm.free()
        ob = link(bpy.data.objects.new("pagina", me))
        solidify(ob, T)
        paint(ob, C["carta_chiara"])
        me = ob.data
        for poly in me.polygons:
            u = abs(poly.center.x) / W
            v = poly.center.z / H + 0.5
            if side > 0 and v > 0.84 and 0.1 < u < 0.92:
                paint(ob, C["titolo"], faces={poly.index})
            elif side > 0 and 0.46 < v < 0.78 and 0.12 < u < 0.62:
                paint(ob, C["foto"], faces={poly.index})
            elif 0.08 < u < 0.92 and 0.05 < v < 0.80 and int(v * nz) % 2 == 0 and not 0.46 < u < 0.54:
                paint(ob, C["inchiostro"], faces={poly.index})
            elif side < 0 and v > 0.84 and 0.2 < u < 0.92:
                paint(ob, C["inchiostro"], faces={poly.index})
        smooth(ob, 30)
        parts.append(ob)
    g = merge("giornale", parts)
    g.data.transform(Matrix.Translation((-W, 0, 0)))
    return g

# ------------------------------------------------------------------ assembly (separate objects, then skinned)
O = lambda n: bpy.data.objects[n]

# bone, parent (parents first). Deforming bones = mesh parts; occhi / punta_dito / piedi are attach points.
BONES = [("corpo", None), ("testa", "corpo"), ("coppola", "testa"), ("palpebre", "testa"), ("occhi", "testa"),
         ("braccio_sx", "corpo"), ("avambraccio_sx", "braccio_sx"), ("mano_sx", "avambraccio_sx"), ("giornale", "mano_sx"),
         ("braccio_dx", "corpo"), ("avambraccio_dx", "braccio_dx"), ("mano_dx", "avambraccio_dx"), ("punta_dito", "mano_dx"),
         ("piedi", None)]
PARTS = ["corpo", "testa", "coppola", "palpebre", "braccio_sx", "avambraccio_sx", "mano_sx", "giornale",
         "braccio_dx", "avambraccio_dx", "mano_dx"]

def build():
    new_scene()
    root = empty("_radice", size=0.1)
    corpo = build_corpo()
    aofn(corpo, collo_ascelle)
    set_origin(corpo, (0, 0, -0.06))
    parent_keep(corpo, root)
    testa = build_testa()
    set_origin(testa, (0, 0.0, 0.245))
    parent_keep(testa, corpo)
    pa, piv = build_palpebre()
    set_origin(pa, piv)
    parent_keep(pa, testa)
    cop, cbase = build_coppola()
    ao(cop, CAP_Z - 0.012, 0.016)      # underside of the brim and bottom of the band
    set_origin(cop, cbase)
    parent_keep(cop, testa)
    for s, nm in ((1, "sx"), (-1, "dx")):
        a = build_braccio(s)
        a.name = "braccio_" + nm
        set_origin(a, (s * SH[0], SH[1], SH[2]))
        parent_keep(a, corpo)
        f = build_avambraccio(s)
        f.name = "avambraccio_" + nm
        set_origin(f, (s * SH[0], SH[1], SH[2] - L1))
        parent_keep(f, a)
        m, w = build_mano(s, dito=(s < 0))
        set_origin(m, w)
        parent_keep(m, f)
        if s < 0:
            parent_keep(empty("punta_dito", w + Vector((-s * 0.004, -0.010, -0.070))), m)
        else:
            g = build_giornale()
            g.location = w + Vector((0.0, -0.030, -0.022))
            bpy.context.view_layer.update()
            parent_keep(g, m)
    parent_keep(empty("piedi", (0, 0, -0.208)), root)
    parent_keep(empty("occhi", (0, -HB, EZ)), testa)
    bpy.context.view_layer.update()
    return root

# ------------------------------------------------------------------ poses on the object hierarchy (root = identity)
def set_world_rot(ob, R3):
    bpy.context.view_layer.update()
    pw = ob.parent.matrix_world.to_3x3().normalized() if ob.parent else Matrix.Identity(3)
    ob.rotation_mode = "QUATERNION"
    ob.rotation_quaternion = (pw.inverted() @ R3).to_quaternion()
    bpy.context.view_layer.update()

def wpos(n):
    bpy.context.view_layer.update()
    return O(n).matrix_world.translation.copy()

def frame3(z_dir, x_hint):
    """World rotation whose local -Z = z_dir (fingers) and local +X ~ x_hint."""
    z = -Vector(z_dir).normalized()
    x = Vector(x_hint)
    x = (x - z * x.dot(z)).normalized()
    y = z.cross(x)
    return Matrix((x, y, z)).transposed()

REST = {}
MOBILI = [n for n, _ in BONES]

def reset():
    for n in MOBILI:
        ob = O(n)
        ob.rotation_mode = "QUATERNION"
        ob.rotation_quaternion = (1, 0, 0, 0)
        ob.location = REST[n]
    bpy.context.view_layer.update()

def rot(n, euler):
    O(n).rotation_quaternion = Euler(euler).to_quaternion()
    bpy.context.view_layer.update()

def arm_ik(side, wrist, pole, shrug=None):
    """Two-bone IK: shoulder (braccio) + elbow (avambraccio) so the wrist reaches `wrist`; the elbow bends
    toward `pole`. Targets in Ettore's space (root = identity while posing)."""
    b = O("braccio_" + side)
    if shrug:
        b.location = REST[b.name] + Vector(shrug)
    bpy.context.view_layer.update()
    s0 = wpos(b.name)
    d = Vector(wrist) - s0
    dist = min(d.length, L1 + L2 - 1e-4)
    u = d.normalized()
    a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist)
    h = math.sqrt(max(L1 * L1 - a * a, 0.0))
    pv = Vector(pole)
    pv = (pv - u * pv.dot(u)).normalized()
    e = s0 + u * a + pv * h
    set_world_rot(b, (e - s0).normalized().to_track_quat("-Z", "Y").to_matrix())
    f = "avambraccio_" + side
    set_world_rot(O(f), ((s0 + u * dist) - wpos(f)).normalized().to_track_quat("-Z", "Y").to_matrix())
    return wpos("mano_" + side)

def hand(side, fingers, palm_x):
    set_world_rot(O("mano_" + side), frame3(fingers, palm_x))

def place_giornale(grip, R3):
    bpy.context.view_layer.update()
    O("giornale").matrix_world = Matrix.Translation(Vector(grip)) @ R3.to_4x4()
    bpy.context.view_layer.update()

def hands_on_bench(sides=("sx", "dx")):
    for side in sides:
        s = 1 if side == "sx" else -1
        arm_ik(side, (s * 0.132, -0.072, 0.082), (s * 0.55, 0.8, -0.1))
        hand(side, (s * 0.12, -0.62, -0.78), (-s, 0, 0))

def giornale_basso():
    # lowered newspaper, folded edge-on against the left wrist, lying along the bench edge
    m = wpos("mano_sx")
    place_giornale(m + Vector((0.020, 0.0, -0.010)),
                   Matrix.Rotation(-math.pi / 2, 3, "Z") @ Matrix.Rotation(-math.pi / 2, 3, "Y"))

def pose_neutro():
    reset()
    hands_on_bench()
    giornale_basso()

def pose_giornale_su():
    reset()
    rot("testa", (0.08, 0, 0))
    # both hands hold the open paper up in front of the face, elbows down and out
    for side in ("sx", "dx"):
        s = 1 if side == "sx" else -1
        arm_ik(side, (s * 0.112, -0.112, 0.272), (s * 0.7, 0.25, -0.7))
        hand(side, (-s * 0.12, -0.05, 1.0), (-s, 0, 0))
    place_giornale((0.105, -0.115, 0.300), Matrix.Rotation(-0.15, 3, "X"))

def pose_dito(spinta=False):
    reset()
    lean = 0.20 if spinta else 0.12
    rot("corpo", (lean, 0, -0.06))
    rot("testa", (0.16, 0, -0.14))
    d = Vector((0.28, -0.86, -0.42 - (0.08 if spinta else 0.0))).normalized()
    w = arm_ik("dx", wpos("braccio_dx") + d * 0.3, (-0.5, 0.8, 0.0))
    hand("dx", d, (1, 0, 0))
    hands_on_bench(("sx",))
    giornale_basso()

def pose_mano_occhi():
    reset()
    # the torch is lit right in his face: turns away, chin up, squints and raises the right palm
    rot("corpo", (0.04, 0, 0.15))
    rot("testa", (-0.20, 0.08, 0.14))
    # palm out toward the light, held in front of the right eye, elbow out and down
    arm_ik("dx", (0.002, -0.150, 0.309), (-0.9, 0.2, -0.5), shrug=(0.010, -0.030, 0.028))
    hand("dx", (-0.30, -0.10, 1.0), (1, 0.45, 0.25))
    hands_on_bench(("sx",))
    giornale_basso()

POSE = {"neutro": (pose_neutro, 1.0), "giornale_su": (pose_giornale_su, 1.0),
        "spinta_dito": (lambda: pose_dito(False), 1.0), "spinta_dito_colpo": (lambda: pose_dito(True), 1.0),
        "mano_occhi": (pose_mano_occhi, 1.45), "sbattere": (pose_neutro, 2.0)}
PALP_CHIUSE = 2.0

def capture():
    bpy.context.view_layer.update()
    return {n: O(n).matrix_world.copy() for n in MOBILI}

# ------------------------------------------------------------------ skinning
def make_rig():
    REST.update({n: O(n).location.copy() for n in MOBILI})
    W = {}
    for nm, (f, _) in POSE.items():
        f()
        W[nm] = capture()
    pose_neutro()
    N = W["neutro"]
    # armature: every bone vertical (+Z), roll 0 -> identity rest rotation in glTF (Y up)
    ad = bpy.data.armatures.new("ettore")
    arm = link(bpy.data.objects.new("ettore", ad))
    for o in bpy.context.selected_objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for n, par in BONES:
        eb = ad.edit_bones.new(n)
        p = N[n].translation
        eb.head = p
        eb.tail = p + Vector((0, 0, 0.02))
        eb.roll = 0.0
        if par:
            eb.parent = ad.edit_bones[par]
        eb.use_deform = n in PARTS
    bpy.ops.object.mode_set(mode="OBJECT")
    # bake every part in the neutral pose, weight it 100% to its bone, join
    mws = {n: O(n).matrix_world.copy() for n in PARTS}
    for n in PARTS:
        ob = O(n)
        ob.parent = None
        ob.matrix_world = Matrix()
        ob.data.transform(mws[n])
        vg = ob.vertex_groups.new(name=n)
        vg.add(list(range(len(ob.data.vertices))), 1.0, "REPLACE")
    body = O("corpo")
    join(body, [O(n) for n in PARTS if n != "corpo"])
    body.name = "ettore_mesh"
    body.data.name = "ettore_mesh"
    for n in ("_radice", "punta_dito", "occhi", "piedi"):
        bpy.data.objects.remove(O(n), do_unlink=True)
    body.parent = arm
    body.matrix_parent_inverse = Matrix()
    md = body.modifiers.new("armatura", "ARMATURE")
    md.object = arm
    bpy.context.view_layer.update()
    # pose-bone values (bone space == three.js local space, see docstring) for every pose
    B = {}
    for nm in POSE:
        set_pose(arm, W[nm], N, POSE[nm][1])
        B[nm] = {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy(), pb.scale.copy()) for pb in arm.pose.bones}
    rest_pose(arm)
    return arm, body, W, N, B

def rest_pose(arm):
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"
        pb.matrix_basis = Matrix()
    bpy.context.view_layer.update()

def set_pose(arm, Wp, N, palp=1.0):
    rest_pose(arm)
    for n, _ in BONES:
        pb, b = arm.pose.bones[n], arm.data.bones[n]
        pb.matrix = (Wp[n] @ N[n].inverted()) @ b.matrix_local
        bpy.context.view_layer.update()
    for pb in arm.pose.bones:     # kill float noise in scale
        pb.scale = (1, 1, 1)
    arm.pose.bones["palpebre"].scale = (1, palp, 1)
    bpy.context.view_layer.update()

def apply_basis(arm, Bp):
    for pb in arm.pose.bones:
        l, q, s = Bp[pb.name]
        pb.rotation_mode = "QUATERNION"
        pb.location, pb.rotation_quaternion, pb.scale = l, q, s
    bpy.context.view_layer.update()

# ------------------------------------------------------------------ glTF clips (30 fps)
CLIPS = {
    # name: [(frame, pose)], bones keyed = those that move in the clip (palpebre only where blinking/squinting)
    "giornale_su": [(0, "neutro"), (12, "giornale_su"), (18, "giornale_su")],
    "spinta_dito": [(0, "neutro"), (8, "spinta_dito"), (12, "spinta_dito_colpo"), (16, "spinta_dito"), (28, "neutro")],
    "mano_occhi": [(0, "neutro"), (8, "mano_occhi"), (36, "mano_occhi")],
    "sbattere": [(0, "neutro"), (3, "sbattere"), (7, "neutro")],
}

def moving(B, poses):
    out = []
    for n, _ in BONES:
        ref = B["neutro"][n]
        for p in poses:
            l, q, s = B[p][n]
            if (l - ref[0]).length > 1e-5 or q.rotation_difference(ref[1]).angle > 1e-4 or (s - ref[2]).length > 1e-5:
                out.append(n)
                break
    return out

def make_clips(arm, B):
    sc = bpy.context.scene
    sc.render.fps = 30
    arm.animation_data_create()
    for name, keys in CLIPS.items():
        act = bpy.data.actions.new(name)
        act.use_fake_user = True
        arm.animation_data.action = act
        bones = moving(B, [p for _, p in keys])
        prev = {}
        for fr, p in keys:
            for n in bones:
                pb = arm.pose.bones[n]
                l, q, s = B[p][n]
                q = q.copy()
                if n in prev and prev[n].dot(q) < 0:
                    q.negate()
                prev[n] = q
                pb.location, pb.rotation_quaternion, pb.scale = l, q, s
                for path in ("location", "rotation_quaternion", "scale"):
                    pb.keyframe_insert(path, frame=fr, group=n)
        tr = arm.animation_data.nla_tracks.new()
        tr.name = name
        tr.strips.new(name, 0, act)
        tr.mute = True
        arm.animation_data.action = None
        print("CLIP", name, keys[-1][0] / 30.0, "s, bones:", bones)
    rest_pose(arm)

def export_glb(arm, body, fname="ettore.glb"):
    drop_unused_slots(body)
    for uv in list(body.data.uv_layers):
        body.data.uv_layers.remove(uv)
    for a in list(body.data.color_attributes):
        if a.name != "Col":
            body.data.color_attributes.remove(a)
    rest_pose(arm)
    bpy.context.scene.frame_set(0)
    for o in bpy.context.selected_objects:
        o.select_set(False)
    arm.select_set(True)
    body.select_set(True)
    path = os.path.join(OUT, fname)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format="GLB", export_yup=True, export_apply=True, use_selection=True,
        export_draco_mesh_compression_enable=False, export_materials="EXPORT", export_vertex_color="MATERIAL",
        export_extras=False, export_lights=False, export_cameras=False,
        export_skins=True, export_def_bones=False, export_all_influences=False,
        export_animations=True, export_animation_mode="ACTIONS", export_force_sampling=True,
        export_reset_pose_bones=True, export_optimize_animation_size=True, export_morph=False,
        export_optimize_animation_keep_anim_armature=False,
    )
    print("EXPORTED", path, os.path.getsize(path))
    return path

def dump_poses(path, arm, B):
    """Local transforms per pose and bone, three.js convention. Every bone has identity rest rotation, so
    bone space == the parent's axes: position = rest offset + pose location, quaternion/scale as they are."""
    import json
    out = {"_nota": "Ossa di ettore.glb (skin). Valori locali three.js (Y su, unita' del file, prima di x1.35). "
                    "Applicare a skeleton.getBoneByName(nome).position/quaternion/scale. Riposo = neutro.",
           "_palpebre": {"aperte": 1.0, "socchiuse": 1.45, "chiuse": PALP_CHIUSE, "asse": "scale.y"}}
    bones = arm.data.bones
    for nm in ("neutro", "giornale_su", "spinta_dito", "mano_occhi", "sbattere"):
        d = {}
        for n, par in BONES:
            b = bones[n]
            r = b.head_local - (bones[par].head_local if par else Vector())
            r3 = Vector((r.x, r.z, -r.y))
            l, q, s = B[nm][n]
            p = r3 + Vector(l)
            d[n] = {"position": [round(v, 4) for v in p], "quaternion": [round(q.x, 4), round(q.y, 4), round(q.z, 4), round(q.w, 4)],
                    "scale": [round(v, 4) for v in s]}
        out[nm] = d
    json.dump(out, open(path, "w"), indent=1)
    print("POSES", path)

# ------------------------------------------------------------------ posed geometry (rigid skin, for framing)
VG = {}
def posed_points(arm, body, groups=None):
    bpy.context.view_layer.update()
    me = body.data
    if not VG:
        names = {g.index: g.name for g in body.vertex_groups}
        for v in me.vertices:
            VG[v.index] = names[max(v.groups, key=lambda g: g.weight).group]
    mats = {pb.name: arm.matrix_world @ pb.matrix @ arm.data.bones[pb.name].matrix_local.inverted() for pb in arm.pose.bones}
    return [mats[VG[v.index]] @ v.co for v in me.vertices if groups is None or VG[v.index] in groups]

def frame_pts(cam, pts, elev, azim, lens, margin=1.1, aim_offset=(0, 0, 0)):
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
    cam.location = c + d * Vector((math.cos(e) * math.sin(a), -math.cos(e) * math.cos(a), math.sin(e)))
    cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()

# ------------------------------------------------------------------ renders
TMP = os.path.join(OUT, "_ettore_tmp")
HEADG = ("testa", "coppola", "palpebre")

def previews(arm, body, B):
    os.makedirs(TMP, exist_ok=True)
    cam, floor = setup_render(res=(900, 1100))
    floor.location.z = -0.208
    sc = bpy.context.scene
    apply_basis(arm, B["neutro"])
    frame_pts(cam, posed_points(arm, body), elev=14, azim=-32, lens=70, margin=1.0)
    render(os.path.join(TMP, "a_figura.png"))
    sc.render.resolution_x, sc.render.resolution_y = 700, 1100
    frame_pts(cam, posed_points(arm, body, HEADG), elev=6, azim=-20, lens=85, margin=0.80, aim_offset=(0, 0, 0.012))
    render(os.path.join(TMP, "b_volto.png"))
    sc.render.resolution_x, sc.render.resolution_y = 700, 900
    for nm, p in (("p1_giornale_su", "giornale_su"), ("p2_dito", "spinta_dito_colpo"), ("p3_mano_occhi", "mano_occhi")):
        apply_basis(arm, B[p])
        frame_pts(cam, posed_points(arm, body), elev=12, azim=-30, lens=70, margin=0.98)
        render(os.path.join(TMP, nm + ".png"))
    apply_basis(arm, B["sbattere"])
    frame_pts(cam, posed_points(arm, body, HEADG), elev=6, azim=-20, lens=85, margin=0.80, aim_offset=(0, 0, 0.012))
    render(os.path.join(TMP, "p4_sbattere.png"))
    apply_basis(arm, B["neutro"])

def imp(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, name + ".glb"))
    new = [o for o in bpy.data.objects if o not in before]
    return [o for o in new if o.parent is None][0]

# final game placement (Blender set units; root of Ettore relative to the scene origin = panno top)
POS_SET = Vector((0.17 / S, 0.270, -0.045 / S))
ROT_Z = -0.22

SETCACHE = {}
def dietro_banco(arm, body, B, path, pose="neutro"):
    from bpy_extras.object_utils import world_to_camera_view
    if not SETCACHE:
        SETCACHE["b"], SETCACHE["t"] = imp("banco"), imp("torcia")
    banco, t = SETCACHE["b"], SETCACHE["t"]
    t.rotation_mode = "XYZ"
    t.matrix_world = Matrix.Translation((0.0, -0.035, 0.0)) @ Matrix.Rotation(math.radians(-90), 4, "Y")
    bpy.context.view_layer.update()
    pts = mesh_points([o for o in t.children_recursive if o.type == "MESH"])
    t.location.x -= (min(p.x for p in pts) + max(p.x for p in pts)) / 2
    t.location.z -= min(p.z for p in pts)
    bpy.context.view_layer.update()
    tc = t.matrix_world.translation.copy()
    arm.location = POS_SET
    arm.rotation_mode = "XYZ"
    arm.rotation_euler = (0, 0, ROT_Z)
    apply_basis(arm, B[pose])
    sc = bpy.context.scene
    bpy.data.objects["_floor"].location.z = -0.66
    sc.render.resolution_x, sc.render.resolution_y = 780, 1688
    cam = sc.camera
    cam.data.sensor_fit = "VERTICAL"
    cam.data.angle_y = math.radians(35)
    C3 = lambda v: Vector((v[0], -v[2], v[1])) / S
    cam.location = tc + C3((-0.18, 1.09, 2.0))
    look = tc + C3((-0.18, -0.13, -0.18))
    cam.rotation_euler = (look - cam.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.view_layer.update()
    def box2(pp):
        q = [world_to_camera_view(sc, cam, p) for p in pp]
        return min(v.x for v in q), max(v.x for v in q), 1 - max(v.y for v in q), 1 - min(v.y for v in q)
    hx0, hx1, ht, hb = box2(posed_points(arm, body, HEADG))
    ax0, ax1, at, ab = box2(posed_points(arm, body))
    cb = bpy.data.objects.get("centro_banco")
    print(f"CAMERA[{pose}] head: top {ht*100:.1f}% bottom {hb*100:.1f}% (height {100*(hb-ht):.1f}% = {(hb-ht)*2532:.0f}px @2532),"
          f" x {hx0*100:.1f}-{hx1*100:.1f}% | whole Ettore x {ax0*100:.1f}-{ax1*100:.1f}%, top {at*100:.1f}%"
          f" | centro_banco {tuple(round(v,4) for v in cb.matrix_world.translation) if cb else None}")
    render(path)

def compose():
    code = r'''
from PIL import Image, ImageDraw, ImageFont
T="/workspace/bottega3d/out/_ettore_tmp/"; O="/workspace/bottega3d/out/"
F="/usr/share/fonts/truetype/dejavu/"
fb=ImageFont.truetype(F+"DejaVuSans-Bold.ttf",26); fr=ImageFont.truetype(F+"DejaVuSans.ttf",17)
def board(files, labels, out, title):
    ims=[Image.open(T+f).convert("RGB") for f in files]
    W=sum(i.width for i in ims)+24*(len(ims)+1); H=max(i.height for i in ims)+110
    im=Image.new("RGB",(W,H),"#FBEFE6"); d=ImageDraw.Draw(im)
    d.text((24,22),title,font=fb,fill="#3C291C")
    x=24
    for i,l in zip(ims,labels):
        m=Image.new("L",i.size,0); ImageDraw.Draw(m).rounded_rectangle((0,0,i.width,i.height),18,fill=255)
        im.paste(i,(x,70),m)
        d.rounded_rectangle((x+12,70+i.height-40,x+24+d.textlength(l,font=fr),70+i.height-12),10,fill="#FFF6EA")
        d.text((x+18,70+i.height-37),l,font=fr,fill="#3C291C")
        x+=i.width+24
    im.save(O+out); print("board",out,im.size)
board(["a_figura.png","b_volto.png"],["3/4 frontale, posa di riposo","primo piano"],"preview_ettore.png",
      "Maestro Ettore v2 - una SkinnedMesh, 1 materiale")
board(["p1_giornale_su.png","p2_dito.png","p3_mano_occhi.png","p4_sbattere.png"],
      ["giornale_su","spinta_dito","mano_occhi","sbattere (palpebre chiuse)"],
      "ettore_pose.png","Maestro Ettore v2 - le 4 clip glTF (fotogramma chiave)")
'''
    subprocess.run(["python3", "-c", code], check=True)

if __name__ == "__main__":
    build()
    arm, body, W, N, B = make_rig()
    tris = sum(len(p.vertices) - 2 for p in body.data.polygons)
    print("TRIS", tris, "VERTS", len(body.data.vertices), "MATS", [m.name for m in body.data.materials if m])
    make_clips(arm, B)
    export_glb(arm, body)
    dump_poses(os.path.join(OUT, "ettore_pose.json"), arm, B)
    for n, _ in BONES:
        b = arm.data.bones[n]
        print("BONE", n, "parent", b.parent.name if b.parent else "-", "head", tuple(round(v, 4) for v in b.head_local))
    if RENDER:
        previews(arm, body, B)
        dietro_banco(arm, body, B, os.path.join(OUT, "ettore_dietro_banco.png"))
        compose()
    if "--banco-pose" in ARGS:
        if not RENDER:
            setup_render(res=(780, 1688))
        os.makedirs(TMP, exist_ok=True)
        for p in ARGS[ARGS.index("--banco-pose") + 1].split(","):
            dietro_banco(arm, body, B, os.path.join(TMP, f"banco_{p}.png"), pose=p)
