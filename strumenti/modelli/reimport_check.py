import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath="/workspace/bottega3d/out/torcia.glb")
dg = bpy.context.evaluated_depsgraph_get()
tot = 0
for o in sorted(bpy.data.objects, key=lambda o: o.name):
    t = 0
    if o.type == "MESH":
        m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); t = len(m.loop_triangles); tot += t
        # flipped-normal sanity: signed volume of closed parts should be > 0
    print("CHK", o.name, o.type, "parent=", o.parent.name if o.parent else None,
          "worldpos=", tuple(round(v, 4) for v in o.matrix_world.translation), "tris=", t)
print("CHK total tris", tot)
