"""Confronta due cartelle di GLB del set 1: nomi dei nodi, gerarchia, pivot (translation/rotation/scale),
tris, draw call e materiali per primitiva. Uso: python3 confronta_nodi.py <dir_prima> <dir_dopo>"""
import json, struct, sys, os
ORDER = ["torcia", "telecomando", "lente", "cacciavite", "pennellino", "leva", "pinzette", "nastro", "banco"]
def load(p):
    b = open(p, "rb").read(); j = struct.unpack_from("<I", b, 12)[0]
    return json.loads(b[20:20 + j])
def tree(g):
    out = []
    acc = g["accessors"]
    def walk(i, path):
        n = g["nodes"][i]; name = n.get("name"); pth = path + "/" + name
        t = tuple(round(v, 5) for v in n.get("translation", [0, 0, 0]))
        r = tuple(round(v, 5) for v in n.get("rotation", [0, 0, 0, 1]))
        s = tuple(round(v, 5) for v in n.get("scale", [1, 1, 1]))
        tris, mats = 0, []
        if "mesh" in n:
            for pr in g["meshes"][n["mesh"]]["primitives"]:
                tris += acc[pr["indices"]]["count"] // 3
                mats.append(g["materials"][pr["material"]]["name"])
        out.append((pth, t, r, s, tris, tuple(mats)))
        for c in n.get("children", []):
            walk(c, pth)
    for r in g["scenes"][g.get("scene", 0)]["nodes"]:
        walk(r, "")
    return out
a, b = sys.argv[1], sys.argv[2]
ok_all = True
for name in ORDER:
    A = tree(load(os.path.join(a, name + ".glb"))); B = tree(load(os.path.join(b, name + ".glb")))
    names_ok = [x[0] for x in A] == [x[0] for x in B]
    piv = [x[0] for x, y in zip(A, B) if x[1:4] != y[1:4]]
    tri = [(x[0], x[4], y[4]) for x, y in zip(A, B) if x[4] != y[4]]
    mat = [x[0] for x, y in zip(A, B) if x[5] != y[5]]
    ok_all &= names_ok and not piv and not mat
    print(f"{name}: nodi={len(B)} nomi+gerarchia {'IDENTICI' if names_ok else 'DIVERSI'}; "
          f"pivot/rot/scala {'identici' if not piv else 'CAMBIATI ' + str(piv)}; "
          f"materiali per primitiva {'identici' if not mat else 'CAMBIATI ' + str(mat)}; "
          f"tris {'invariati' if not tri else tri}")
print("ESITO:", "OK - nessun nodo rinominato, spostato o riparentato" if ok_all else "ATTENZIONE")
