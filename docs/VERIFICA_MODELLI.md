# Verifica set 1 (generata da scripts/verifica_set.py)

| asset | file | KB | tris | draw call | materiali | ingombro X×Y×Z (m, three.js) | ×1.35 in gioco |
|---|---|---|---|---|---|---|---|
| torcia | out/torcia.glb | 161 | 3408 | 10 | bottega_metallo, bottega_opaco, torcia_contatto, torcia_ossido, torcia_vetro | 0.114×0.259×0.114 | 0.154×0.350×0.154 |
| telecomando | out/telecomando.glb | 150 | 2636 | 6 | bottega_metallo, bottega_opaco | 0.066×0.030×0.177 | 0.089×0.040×0.240 |
| lente | out/lente.glb | 21 | 620 | 2 | bottega_opaco, lente_vetro | 0.073×0.146×0.017 | 0.099×0.198×0.023 |
| cacciavite | out/cacciavite.glb | 13 | 288 | 2 | bottega_metallo, bottega_opaco | 0.026×0.166×0.026 | 0.035×0.224×0.035 |
| pennellino | out/pennellino.glb | 13 | 360 | 2 | bottega_opaco | 0.019×0.153×0.019 | 0.025×0.207×0.025 |
| leva | out/leva.glb | 22 | 360 | 1 | bottega_opaco | 0.018×0.110×0.008 | 0.024×0.148×0.010 |
| pinzette | out/pinzette.glb | 17 | 272 | 2 | bottega_metallo | 0.015×0.120×0.008 | 0.020×0.162×0.011 |
| nastro | out/nastro.glb | 17 | 460 | 1 | bottega_opaco | 0.058×0.023×0.067 | 0.078×0.031×0.091 |
| banco | out/banco.glb | 107 | 1676 | 4 | bottega_opaco | 0.800×0.731×0.460 | 1.080×0.987×0.621 |

**Totale set: 10080 triangoli (25% di 40000), 30 draw call (60% di 50), 6 materiali unici: bottega_metallo, bottega_opaco, lente_vetro, torcia_contatto, torcia_ossido, torcia_vetro**

### torcia.glb
```
torcia pivot=(0.0000, 0.0000, 0.0000)
  bottone pivot=(0.0000, 0.1200, 0.0440)  tris=108 draw=1 [bottega_opaco]
  centro_torcia pivot=(0.0000, 0.1200, 0.0000)
  corpo pivot=(0.0000, 0.0000, 0.0000)  tris=540 draw=2 [bottega_opaco, bottega_metallo]
    vetro pivot=(0.0000, 0.0000, 0.0000)  tris=96 draw=1 [torcia_vetro]
  pila_a pivot=(-0.0160, 0.0655, 0.0000)  tris=640 draw=1 [bottega_opaco]
  pila_b pivot=(0.0160, 0.0655, 0.0000)  tris=640 draw=1 [bottega_opaco]
  sede_a pivot=(-0.0160, 0.0655, 0.0000)
  sede_b pivot=(0.0160, 0.0655, 0.0000)
  tappo pivot=(0.0000, 0.0300, 0.0000)  tris=720 draw=1 [bottega_opaco]
    contatto pivot=(0.0000, 0.0360, 0.0000)  tris=304 draw=1 [torcia_contatto]
    macchia pivot=(0.0260, 0.0000, 0.0120)  tris=20 draw=1 [torcia_ossido]
    vite pivot=(0.0000, -0.0015, 0.0000)  tris=340 draw=1 [bottega_metallo]
```
Issues: none

### telecomando.glb
```
telecomando pivot=(0.0000, 0.0000, 0.0000)
  centro_interno pivot=(0.0000, 0.0080, 0.0000)
  centro_telecomando pivot=(0.0000, 0.0260, 0.0000)
  fessura_a pivot=(0.0330, 0.0110, -0.0590)
  fessura_b pivot=(0.0330, 0.0110, 0.0590)
  filo pivot=(-0.0235, 0.0090, -0.0100)  tris=92 draw=1 [bottega_opaco]
  gancio_1 pivot=(0.0330, 0.0110, -0.0295)
  gancio_2 pivot=(0.0330, 0.0110, 0.0000)
  gancio_3 pivot=(0.0330, 0.0110, 0.0295)
  guscio pivot=(-0.0330, 0.0110, 0.0000)  tris=1036 draw=1 [bottega_opaco]
    tasto_on pivot=(-0.0140, 0.0255, -0.0580)  tris=80 draw=1 [bottega_opaco]
  guscio_sotto pivot=(0.0000, 0.0000, 0.0000)  tris=1168 draw=1 [bottega_opaco]
  molla pivot=(0.0100, 0.0105, -0.0260) rot(q)=-0.193,0.230,-0.613,0.731  tris=196 draw=1 [bottega_metallo]
  nastro_filo pivot=(-0.0235, 0.0090, -0.0180)  tris=64 draw=1 [bottega_opaco]
  rame pivot=(-0.0235, 0.0090, -0.0100)
  sede_molla pivot=(0.0115, 0.0096, 0.0763)
```
Issues: none

### lente.glb
```
lente pivot=(0.0000, 0.0000, 0.0000)
  montatura pivot=(0.0000, 0.0000, 0.0000)  tris=460 draw=1 [bottega_opaco]
  punta_lente pivot=(0.0000, 0.0000, 0.0000)
  vetro_lente pivot=(0.0000, 0.0000, 0.0000)  tris=160 draw=1 [lente_vetro]
```
Issues: none

### cacciavite.glb
```
cacciavite pivot=(0.0000, 0.0000, 0.0000)
  corpo_cacciavite pivot=(0.0000, 0.0000, 0.0000)  tris=288 draw=2 [bottega_opaco, bottega_metallo]
  impugnatura pivot=(0.0000, 0.1150, 0.0000)
```
Issues: none

### pennellino.glb
```
pennellino pivot=(0.0000, 0.0000, 0.0000)
  manico_pennello pivot=(0.0000, 0.0000, 0.0000)  tris=240 draw=1 [bottega_opaco]
  setole pivot=(0.0000, 0.0260, 0.0000)  tris=120 draw=1 [bottega_opaco]
```
Issues: none

### leva.glb
```
leva pivot=(0.0000, 0.0000, 0.0000)
  corpo_leva pivot=(0.0000, 0.0000, 0.0000)  tris=360 draw=1 [bottega_opaco]
```
Issues: none

### pinzette.glb
```
pinzette pivot=(0.0000, 0.0000, 0.0000)
  braccio_dx pivot=(0.0016, 0.1140, 0.0000)  tris=136 draw=1 [bottega_metallo]
  braccio_sx pivot=(-0.0016, 0.1140, 0.0000)  tris=136 draw=1 [bottega_metallo]
  presa pivot=(0.0000, 0.0020, 0.0000)
```
Issues: none

### nastro.glb
```
nastro pivot=(0.0000, 0.0000, 0.0000)
  rotolo pivot=(0.0000, 0.0000, 0.0000)  tris=460 draw=1 [bottega_opaco]
```
Issues: none

### banco.glb
```
banco pivot=(0.0000, 0.0000, 0.0000)
  banco_mesh pivot=(0.0000, 0.0000, 0.0000)  tris=1056 draw=1 [bottega_opaco]
  cassetto pivot=(0.2750, 0.0035, -0.0075)  tris=300 draw=1 [bottega_opaco]
    pila_nuova_a pivot=(0.2750, 0.0205, -0.0295) rot(q)=0.000,0.000,-0.707,0.707  tris=160 draw=1 [bottega_opaco]
    pila_nuova_b pivot=(0.2750, 0.0205, -0.0575) rot(q)=0.000,0.000,-0.707,0.707  tris=160 draw=1 [bottega_opaco]
  centro_banco pivot=(0.0000, 0.0000, 0.0220)
  vassoietto pivot=(-0.2700, -0.0010, 0.0500)
```
Issues: none
