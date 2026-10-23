"""Dump node tree, pivots (local translation, three.js Y-up), triangles and materials of a GLB. No deps."""
import json, struct, sys, os
p = sys.argv[1] if len(sys.argv) > 1 else "/workspace/bottega3d/out/torcia.glb"
b = open(p, "rb").read()
magic, ver, length = struct.unpack_from("<4sII", b, 0)
jlen, jtype = struct.unpack_from("<I4s", b, 12)
g = json.loads(b[20:20 + jlen])
acc = g["accessors"]
def tris(mi):
    t = 0
    for pr in g["meshes"][mi]["primitives"]:
        t += (acc[pr["indices"]]["count"] if "indices" in pr else acc[pr["attributes"]["POSITION"]]["count"]) // 3
    return t
total = 0
def walk(i, depth, parent_t):
    global total
    n = g["nodes"][i]
    t = n.get("translation", [0, 0, 0])
    w = [parent_t[k] + t[k] for k in range(3)]
    extra = ""
    if "mesh" in n:
        tr = tris(n["mesh"]); total += tr
        mats = [g["materials"][pr["material"]]["name"] for pr in g["meshes"][n["mesh"]]["primitives"] if "material" in pr]
        extra = f"  tris={tr}  mats={mats}"
    r = n.get("rotation"); s = n.get("scale")
    print("  " * depth + f"- {n.get('name')}  local={[round(v,4) for v in t]}  world={[round(v,4) for v in w]}"
          + (f" rot={r}" if r else "") + (f" scale={s}" if s else "") + extra)
    for c in n.get("children", []):
        walk(c, depth + 1, w)
print(f"file={p} bytes={os.path.getsize(p)} glTF v{ver} generator={g['asset'].get('generator')}")
print("extensionsUsed:", g.get("extensionsUsed", []))
for sc in g["scenes"]:
    for r in sc["nodes"]:
        walk(r, 0, [0, 0, 0])
print("TOTAL triangles:", total)
print("materials:")
for m in g["materials"]:
    pb = m.get("pbrMetallicRoughness", {})
    c = pb.get("baseColorFactor", [1, 1, 1, 1])
    lin2s = lambda v: round(255 * (12.92 * v if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055))
    print(f"  {m['name']}: base=#{''.join(f'{lin2s(x):02X}' for x in c[:3])} rough={pb.get('roughnessFactor',1)} metal={pb.get('metallicFactor',1)} textures={'baseColorTexture' in pb}")
print("textures:", len(g.get("textures", [])), "images:", len(g.get("images", [])))
