"""
La Bottega - group shot of set 1: imports the EXPORTED GLBs (re-import check) and lays them out
on the bench. Renders (1) the game camera of scena.js converted to set units, portrait 390x844 x2,
vertical FOV 35 (PRIMI_ISTANTI 5.2), and (2) a wide establishing shot of the whole bench.
Run: /opt/blender/blender -b -P scena_gruppo.py -- [--samples N]
"""
import bpy, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comune import *
from mathutils import Euler, Matrix, Vector

S = 1.35   # game world units / set units
ZB = -0.004  # bench top (off the cloth)

def imp(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, name + ".glb"))
    new = [o for o in bpy.data.objects if o not in before]
    root = [o for o in new if o.parent is None and o.name.startswith(name)]
    assert len(root) == 1, (name, [o.name for o in new if o.parent is None])
    return root[0]

def meshes(root):
    return [o for o in root.children_recursive if o.type == "MESH"]

def place(root, x, y, rot=(0, 0, 0), yaw=0.0, z=ZB):
    root.rotation_mode = "XYZ"
    root.location = (0, 0, 0)
    root.rotation_euler = rot
    bpy.context.view_layer.update()
    root.matrix_world = Matrix.Rotation(math.radians(yaw), 4, "Z") @ root.matrix_world
    bpy.context.view_layer.update()
    pts = mesh_points(meshes(root))
    cx = (min(p.x for p in pts) + max(p.x for p in pts)) / 2
    cy = (min(p.y for p in pts) + max(p.y for p in pts)) / 2
    root.location = (x - cx, y - cy, z - min(p.z for p in pts))
    bpy.context.view_layer.update()

def main():
    new_scene()
    R = {n: imp(n) for n in ["banco", "torcia", "telecomando", "lente", "cacciavite", "pennellino",
                             "leva", "pinzette", "nastro"]}
    # torch: lying on the cloth, head right, button to the camera (BANCO pose of B2)
    t = R["torcia"]
    t.rotation_mode = "XYZ"
    t.matrix_world = (Matrix.Translation((0.0, -0.035, 0.0)) @ Matrix.Rotation(math.radians(90), 4, "Y"))
    bpy.context.view_layer.update()
    pts = mesh_points(meshes(t))
    t.location.x -= (min(p.x for p in pts) + max(p.x for p in pts)) / 2
    t.location.z -= min(p.z for p in pts)
    bpy.context.view_layer.update()
    place(R["telecomando"], 0.205, -0.075, yaw=-14)
    place(R["lente"], -0.300, 0.115, rot=(math.radians(90), 0, 0), yaw=35)
    place(R["nastro"], -0.170, 0.110)
    place(R["cacciavite"], -0.020, 0.165, rot=(0, math.radians(90), 0), yaw=-6)
    place(R["pennellino"], -0.030, 0.115, rot=(0, math.radians(90), 0), yaw=8)
    place(R["leva"], 0.120, 0.170, rot=(math.radians(90), 0, math.radians(90)), yaw=-10)
    place(R["pinzette"], 0.125, 0.125, rot=(0, math.radians(90), 0), yaw=12)
    cam, floor = setup_render()
    floor.location.z = -0.66
    sc = bpy.context.scene
    # (1) game camera (scena.js: pos (0,0.4,0.36) look (0,0.05,0) world units) -> Blender set units
    sc.render.resolution_x, sc.render.resolution_y = 780, 1688
    cam.data.sensor_fit = "VERTICAL"
    cam.data.angle_y = math.radians(36)   # scena.js portrait fov (PRIMI_ISTANTI 5.2 says 35)
    cam.location = (0, -0.36 / S, 0.40 / S)
    cam.rotation_euler = (Vector((0, 0, 0.05 / S)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    lying = t.matrix_world.copy()
    # torch at the game's pose `ingresso` (contenuti.js: pos [0,0.03,0.02], rot [0.15,0.45,0], world units)
    C = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))           # three.js -> Blender axes
    Rt = Euler((0.15, 0.45, 0.0), "XYZ").to_matrix()          # three.js uses XYZ order too
    Rb = C @ Rt @ C.inverted()
    t.matrix_world = Matrix.Translation(C @ Vector((0, 0.03, 0.02)) / S) @ Rb.to_4x4()
    bpy.context.view_layer.update()
    render(os.path.join(OUT, "gruppo_camera_gioco.png"))
    # proposal: same direction and fov, camera 2.2x further from the target (shows torch + cloth + tools)
    tgt = Vector((0, 0, 0.05 / S))
    cam.location = tgt + (cam.location - tgt) * 2.2
    render(os.path.join(OUT, "gruppo_camera_proposta.png"))
    t.matrix_world = lying
    bpy.context.view_layer.update()
    # (2) wide establishing shot, same direction, pulled back to show the whole set
    sc.render.resolution_x, sc.render.resolution_y = 1600, 1000
    cam.data.sensor_fit = "AUTO"
    allm = [o for r in R.values() for o in meshes(r) if o.name not in ("banco_mesh",)]
    frame(cam, allm, elev=46, azim=0, lens=40, margin=0.82, aim_offset=(0, 0.01, 0))
    render(os.path.join(OUT, "gruppo_banco_largo.png"))

if __name__ == "__main__":
    main()
