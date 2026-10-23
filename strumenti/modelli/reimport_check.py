"""Re-import check in Blender: imports each GLB of set 1 back and prints node, type, parent, world position
and triangles. Run: /opt/blender/blender -b -P reimport_check.py -- [asset ...]   (default: all 9 assets)"""
import bpy, sys
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
NAMES = ARGS or ["torcia", "telecomando", "lente", "cacciavite", "pennellino", "leva", "pinzette", "nastro", "banco"]
grand = 0
for name in NAMES:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=f"/workspace/bottega3d/out/{name}.glb")
    dg = bpy.context.evaluated_depsgraph_get()
    tot = 0
    for o in sorted(bpy.data.objects, key=lambda o: o.name):
        t = 0
        if o.type == "MESH":
            m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); t = len(m.loop_triangles); tot += t
            assert len(m.color_attributes) > 0 or not any(s.material and s.material.name.startswith("bottega_")
                                                          for s in o.material_slots), (o.name, "no COLOR_0")
        print("CHK", name, o.name, o.type, "parent=", o.parent.name if o.parent else None,
              "worldpos=", tuple(round(v, 4) for v in o.matrix_world.translation), "tris=", t)
    print("CHK", name, "total tris", tot)
    grand += tot
print("CHK set total tris", grand)
