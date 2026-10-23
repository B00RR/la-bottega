"""Validate every GLB of set 1 (no deps): node tree with pivots (three.js, Y-up, world space incl.
rotations), tris, draw calls (= primitives), materials, bbox size, bytes, COLOR_0 presence.
Writes out/verifica_set.md and prints it.  Usage: python3 verifica_set.py"""
import json, struct, os, math
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out")
ORDER = ["torcia", "telecomando", "lente", "cacciavite", "pennellino", "leva", "pinzette", "nastro", "banco"]
BUDGET_TRIS, BUDGET_DC = 40000, 50

def qmul(a, b):
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return (aw*bx + ax*bw + ay*bz - az*by, aw*by - ax*bz + ay*bw + az*bx,
            aw*bz + ax*by - ay*bx + az*bw, aw*bw - ax*bx - ay*by - az*bz)
def qrot(q, v):
    x, y, z, w = q
    p = (v[0], v[1], v[2], 0.0)
    r = qmul(qmul(q, p), (-x, -y, -z, w))
    return r[:3]

def load(p):
    b = open(p, "rb").read()
    jlen = struct.unpack_from("<I", b, 12)[0]
    return json.loads(b[20:20 + jlen]), os.path.getsize(p)

rows, lines = [], []
tot_t = tot_dc = 0
allmats = set()
for name in ORDER:
    p = os.path.join(OUT, name + ".glb")
    g, size = load(p)
    acc = g["accessors"]
    lo = [1e9] * 3; hi = [-1e9] * 3
    cnt = {'t': 0, 'dc': 0}
    mats = set()
    nodes_desc = []
    issues = []
    def walk(i, depth, wpos, wq, wscale):
        n = g["nodes"][i]
        t = n.get("translation", [0, 0, 0]); q = n.get("rotation", [0, 0, 0, 1]); s = n.get("scale", [1, 1, 1])
        if s != [1, 1, 1]:
            issues.append(f"{n.get('name')} has scale {s}")
        pos = [a + b for a, b in zip(wpos, qrot(wq, [t[k] * wscale for k in range(3)]))]
        qq = qmul(wq, q)
        desc = f"{'  ' * depth}{n.get('name')} pivot=({pos[0]:.4f}, {pos[1]:.4f}, {pos[2]:.4f})"
        if q != [0, 0, 0, 1]:
            desc += " rot(q)=" + ",".join(f"{v:.3f}" for v in q)
        if "mesh" in n:
            m = g["meshes"][n["mesh"]]
            tr = 0
            for pr in m["primitives"]:
                tr += (acc[pr["indices"]]["count"] if "indices" in pr else acc[pr["attributes"]["POSITION"]]["count"]) // 3
                mn = g["materials"][pr["material"]]["name"] if "material" in pr else "(none)"
                mats.add(mn)
                vc = "COLOR_0" in pr["attributes"]
                if mn.startswith("bottega_") and not vc:
                    issues.append(f"{n.get('name')}: {mn} without COLOR_0")
                if not mn.startswith("bottega_") and vc:
                    issues.append(f"{n.get('name')}: flat material {mn} but COLOR_0 present")
                a = acc[pr["attributes"]["POSITION"]]
                for cx in (a["min"][0], a["max"][0]):
                    for cy in (a["min"][1], a["max"][1]):
                        for cz in (a["min"][2], a["max"][2]):
                            w = [pp + v for pp, v in zip(pos, qrot(qq, (cx, cy, cz)))]
                            for k in range(3):
                                lo[k] = min(lo[k], w[k]); hi[k] = max(hi[k], w[k])
            dc = len(m["primitives"])
            cnt['t'] += tr; cnt['dc'] += dc
            desc += f"  tris={tr} draw={dc} [{', '.join(g['materials'][pr['material']]['name'] for pr in m['primitives'])}]"
        nodes_desc.append(desc)
        for c in n.get("children", []):
            walk(c, depth + 1, pos, qq, wscale)
    for r in g["scenes"][g.get("scene", 0)]["nodes"]:
        walk(r, 0, [0, 0, 0], (0, 0, 0, 1), 1.0)
    if g.get("textures"):
        issues.append(f"{len(g['textures'])} textures")
    if g.get("extensionsUsed"):
        issues.append("extensions " + ",".join(g["extensionsUsed"]))
    dims = [hi[k] - lo[k] for k in range(3)]
    t_asset, dc_asset = cnt['t'], cnt['dc']
    tot_t += t_asset; tot_dc += dc_asset; allmats |= mats
    rows.append((name, size, t_asset, dc_asset, sorted(mats), dims, issues))
    lines.append(f"### {name}.glb\n```\n" + "\n".join(nodes_desc) + "\n```\n"
                 + (f"Issues: {issues}\n" if issues else "Issues: none\n"))

md = ["# Verifica set 1 (generata da scripts/verifica_set.py)", "",
      "| asset | file | KB | tris | draw call | materiali | ingombro X×Y×Z (m, three.js) | ×1.35 in gioco |",
      "|---|---|---|---|---|---|---|---|"]
for name, size, t, dc, mats, d, iss in rows:
    md.append(f"| {name} | out/{name}.glb | {size/1024:.0f} | {t} | {dc} | {', '.join(mats)} | "
              f"{d[0]:.3f}×{d[1]:.3f}×{d[2]:.3f} | {d[0]*1.35:.3f}×{d[1]*1.35:.3f}×{d[2]*1.35:.3f} |")
md += ["", f"**Totale set: {tot_t} triangoli ({100*tot_t/BUDGET_TRIS:.0f}% di {BUDGET_TRIS}), "
           f"{tot_dc} draw call ({100*tot_dc/BUDGET_DC:.0f}% di {BUDGET_DC}), "
           f"{len(allmats)} materiali unici: {', '.join(sorted(allmats))}**", ""]
md += lines
txt = "\n".join(md)
open(os.path.join(OUT, "verifica_set.md"), "w").write(txt)
print(txt)
