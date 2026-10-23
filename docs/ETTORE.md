# Maestro Ettore (`public/modelli/ettore.glb`), v2

Personaggio originale per La Bottega, modellato con uno script Blender 4.2 (`strumenti/modelli/ettore.py`, usa
`comune.py`). Nel file c'è **una sola SkinnedMesh** (`ettore_mesh`) con **un solo materiale** (`bottega_opaco`,
roughness 0.62, metalness 0). Colori e AO (−14 % sotto la coppola, sul collo e sotto le braccia) sono nei vertici
(`COLOR_0`). Non ci sono texture né UV.

- Palette di Ettore: camicia #6F9E88 e colletto/polsini #5F8E78 (piu' scura della salvia #8FBFA8 di torcia e panno), pelle e naso #EBC3A6 (colori base, prima dell'AO -14 %).

| | |
|---|---|
| Triangoli | **5 996** (budget Ettore ≤ 6 000) |
| Draw call | **1** (1 mesh × 1 primitiva × 1 materiale), più 1 nel passaggio ombre se `castShadow` |
| Ossa | 14 (11 deformano, 3 sono punti di aggancio) |
| Pesi | rigidi: ogni vertice al 100 % sull'osso della sua parte (`JOINTS_0`/`WEIGHTS_0`, 1 influenza) |
| Clip glTF | `giornale_su` 0.60 s, `spinta_dito` 0.93 s, `mano_occhi` 1.20 s, `sbattere` 0.23 s |
| File | 304 KB |

## Scala e posizione nella scena
Il file è nelle unità del set, non scalate, come tutti gli altri GLB: **il gioco applica ×1.35**. L'origine di
`ettore` è il piano del panno (y = 0 del set). Davanti = +Z three.js, sinistra di Ettore (`_sx`) = +X.

Posizione del nodo `ettore` rispetto a `centro_banco` (assi three.js, Y in alto):

| | unità del file (dentro il gruppo ×1.35) | metri in gioco (dopo ×1.35) |
|---|---|---|
| position − centro_banco | (+0.1259, −0.0333, −0.2920) | **(+0.170, −0.045, −0.394)** |
| rotation | y = **−0.22 rad** (girato verso la torcia), x = z = 0 | uguale |

`centro_banco` in `banco.glb` è a (0, 0, +0.022) nelle unità del file, quindi rispetto all'origine del set Ettore
sta a (+0.1259, −0.0333, −0.270), cioè (+0.170, −0.045, −0.3645) m in gioco. Rispetto alla v1 Ettore è a x 0.17 m
invece di 0.22 m ed è 4.5 cm più in basso. Le spalle restano larghe 0.40 m.

```js
const ettore = gltf.scene.getObjectByName('ettore');
const cb = banco.getObjectByName('centro_banco');          // nello stesso gruppo scalato ×1.35
ettore.position.copy(cb.position).add(new THREE.Vector3(0.1259, -0.0333, -0.2920));
ettore.rotation.set(0, -0.22, 0);
```

Misure in gioco (dopo ×1.35, rispetto al piano del panno): centro della testa +0.367 m, cima della coppola
+0.484 m, spalle 0.40 m, suola delle scarpe −0.339 m.

Inquadratura (camera BANCO della REVISIONE §4, FOV 35, 780×1688): la testa va dal 11.4 % al 26.7 % dell'altezza
dello schermo (388 px su 2532) e da x 57 % a x 94 %. Il gomito sinistro esce di circa il 5 % dal bordo destro,
ma dietro la cassettiera non si vede comunque.

### Pedana nascosta (necessaria)
Le gambe arrivano a −0.339 m (in gioco) sotto il panno, mentre il pavimento del banco è a −0.89 m. Dietro il banco
serve una pedana invisibile (o nessun pavimento visibile in quel punto) con il piano a **y = −0.339 m** rispetto
al panno. Per questo c'è l'osso `piedi`: si legge la sua posizione nel mondo e lì si appoggia la pedana. Le
gambe stanno dietro il piano del banco e dalla camera di gioco non si vedono.

## Ossa (gerarchia e perni)
Tutte le ossa sono verticali con roll 0. In glTF e in three.js hanno quindi **rotazione di riposo identità**: gli
assi locali di ogni osso sono quelli di Ettore (X = sua sinistra, Y = su, Z = avanti). `rotation.x` positivo inclina
in avanti quello che sta sopra il perno (testa che annuisce). Un braccio, che pende sotto la spalla, si alza in avanti
con `rotation.x` negativo. Le posizioni sono i perni nelle unità
del file (assi three.js) e vanno moltiplicate per 1.35 per avere i metri in gioco.

```
ettore                      nodo radice (armatura), da posizionare nella scena; non è un joint
├─ corpo          (0, −0.060, 0)           bacino: busto, grembiule, gambe
│  ├─ testa       (0, +0.245, 0)           collo
│  │  ├─ coppola  (0, +0.338, −0.004)      base del cappello
│  │  ├─ palpebre (0, +0.3255, +0.0718)    linea alta delle due palpebre
│  │  └─ occhi    (0, +0.309, +0.078)      aggancio: centro tra gli occhi (nuvoletta, sguardo)
│  ├─ braccio_sx  (+0.112, +0.200, 0)      spalla
│  │  └─ avambraccio_sx (+0.141, +0.143, +0.004)   gomito
│  │     └─ mano_sx     (+0.132, +0.082, +0.072)   polso
│  │        └─ giornale (+0.152, +0.072, +0.072)   presa sul bordo del giornale
│  └─ braccio_dx  (−0.112, +0.200, 0)      spalla
│     └─ avambraccio_dx (−0.141, +0.143, +0.004)   gomito
│        └─ mano_dx     (−0.132, +0.082, +0.072)   polso
│           └─ punta_dito (−0.136, +0.033, +0.123) aggancio: punta dell'indice
└─ piedi          (0, −0.208, 0)           aggancio: suola (pedana)
```

Le ossa `occhi`, `punta_dito` e `piedi` non hanno vertici: servono solo per leggere `getWorldPosition()`.

**Attenzione al contratto attuale:** in `src/gioco/modelli.js` c'è ancora
`PARTI.ettore = ['Corpo', 'Testa', 'Giornale', 'Cappello', 'Mano']`. Va aggiornato con i nomi qui sopra (minuscoli,
`coppola` al posto di `Cappello`, `mano_sx`/`mano_dx`). Le ossa sono `Object3D`, quindi `getObjectByName` le trova.
Non vanno però staccate dallo scheletro né usate come mesh separate.

## Pose: clip o JSON
**Clip (consigliato).** `gltf.animations` contiene 4 clip a 30 fps, campionate lineari. Ogni clip contiene solo
le ossa che si muovono.

| clip | contenuto | come usarla |
|---|---|---|
| `giornale_su` | da riposo a giornale alzato con due mani davanti alla faccia (0 → 0.4 s, tiene fino a 0.6 s) | `LoopOnce` + `clampWhenFinished`. Per abbassarlo: stessa azione con `timeScale = -1` |
| `spinta_dito` | si sporge, punta l'indice in basso in avanti, dà un colpetto e torna a riposo | `LoopOnce` |
| `mano_occhi` | la torcia lo abbaglia: testa indietro e girata, palmo davanti all'occhio destro, occhi socchiusi (palpebre 1.45) | `LoopOnce` + `clampWhenFinished`, poi `fadeOut` |
| `sbattere` | un battito di palpebre (1 → 2 → 1) | si può suonare insieme alle altre, tranne `mano_occhi` che usa anche lei `palpebre` |

```js
const mixer = new THREE.AnimationMixer(ettore);
const su = mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'giornale_su'));
su.setLoop(THREE.LoopOnce); su.clampWhenFinished = true; su.play();
// abbassare: su.paused = false; su.timeScale = -1; su.play();
```

**JSON.** `ettore_pose.json` (strumenti) contiene, per `neutro`, `giornale_su`, `spinta_dito`, `mano_occhi` e
`sbattere`, i valori locali `position` / `quaternion` / `scale` di ogni osso in convenzione three.js e nelle
unità del file. Si assegnano a `skeleton.getBoneByName(n)` e si interpolano con `lerp`/`slerp`. Il riposo è
`neutro`: mani sul banco, giornale aperto, tenuto di taglio e appeso al polso sinistro.

## Battito di palpebre
Le palpebre sono una parte sola (`palpebre`) con il perno sulla loro linea alta. Si anima **solo `scale.y`**:
`1` = aperte (riposo), `1.45` = socchiuse, `2` = chiuse. È la soluzione più semplice in three.js, perché l'osso ha
rotazione di riposo identità e quindi il suo Y locale è sempre la verticale della testa.

```js
const palpebre = ettore.getObjectByName('palpebre');
// a mano, ogni 3–6 s: chiude in 0.1 s e riapre in 0.13 s
palpebre.scale.y = 1 + chiusura;        // chiusura 0..1
// oppure: mixer.clipAction(findByName(gltf.animations, 'sbattere')).reset().play();
```

## Impatto sul budget della scena
Il set 1 misurato fa 10 080 triangoli e 30 draw call. Con Ettore v2 si arriva a **16 076 triangoli e 31 draw call**
(32 con l'ombra di Ettore). Il budget è < 40 000 triangoli e < 50 draw call. Ettore resta nella sua voce
(≤ 6 000 / ≤ 4) e ne libera 3 draw call. Lo skinning usa 14 ossa con 1 influenza per vertice, un costo trascurabile
nel vertex shader. Se servono ombre: `ettore_mesh.castShadow = true`, ed eventualmente
`frustumCulled = false` se nelle pose estreme il giornale sparisce ai bordi.

## Verifiche fatte
- Reimport in Blender 4.2: armatura `ettore` con 14 ossa, `ettore_mesh` con modificatore Armature, 1 materiale,
  14 gruppi di vertici, 0 vertici con peso diverso da 100 % su un solo osso, 4 azioni.
- three.js r170 `GLTFLoader` in Node: 1 mesh, 1 `SkinnedMesh`, 1 primitiva, 1 materiale, 5 996 triangoli,
  rotazioni di riposo tutte identità, 4 clip che spostano le mani e le palpebre come previsto.
- three.js WebGL headless (Playwright + SwiftShader): le 5 pose si disegnano, 1 draw call per Ettore.
