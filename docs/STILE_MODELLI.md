# La Bottega: tavola di stile v1 (proposta, da approvare)

Campione di stile: la torcia (`out/torcia.glb`, sorgente `scripts/torcia.py`).
Tavola: `out/tavola_stile.png`. Il telecomando, gli attrezzi e il banco aspettano l'approvazione di questa tavola.

## Direzione
Low-poly "giocattolo": proporzioni tozze, silhouette leggibili da lontano, sfaccettature visibili sui profili
(12 segmenti radiali per gli oggetti, da 8 a 10 per le parti piccole). Colori pastello caldi e piatti, niente texture.
Dettagli fatti con la forma (anelli, zigrinature, viti), non dipinti.

## Palette (sRGB)
| Nome | Hex | Ruolo |
|---|---|---|
| pesca | #F4D2C0 | muro e sfondo (`scene.background`) |
| terracotta | #E8977C | corpo dell'oggetto principale (torcia) |
| salvia | #8FBFA8 | tappi, impugnature, panno |
| miele | #F0B86E | ghiere, pulsanti, accenti |
| oro | #FFE7B0 | lenti e luce calda (emissive #FFD59A) |
| crema | #FFF6EA | etichette, parti chiare |
| legno | #C4844E | banco, cassetto |
| acciaio caldo | #A99E94 | metallo grande (testa torcia) |
| argento | #D9DDE2 | contatti, poli, viti |
| oliva | #8A9A5B | pile scariche (le pile nuove sono #7DBE6E) |
| ossido | #6E8B4E | sporco e ossido (diventa #C5C8CC quando è pulito) |
| cacao | #3C291C | il tono più scuro: incavi e occhi |
| interno | #7A3E2C | interni cavi (vano pile) |

## Materiali
- Un solo `MeshStandardMaterial` per colore della palette, condiviso tra gli oggetti (nel glTF diventa Principled BSDF).
  Il nome è `<oggetto>_<ruolo>` (per esempio `torcia_salvia`).
- Roughness: plastica 0.45–0.6, legno e stoffa 0.75–0.9, vetro o lente 0.2. Metalness 0, tranne i metalli (0.55–0.75, roughness 0.3–0.4).
- Niente texture. Si accetta solo una piccola texture canvas fatta a runtime quando serve al gioco (lo schermo della TV).
- L'emissive è solo un feedback di gioco ed è il codice ad accenderlo (lente accesa, macchia scoperta). Nel GLB resta a 0.
- Bevel: smussi da 1 segmento, da 1 a 3 mm, già dentro il profilo. Niente subdivision e niente modificatori bevel pesanti.
- Shading: smooth by angle a 30–40°. I cilindri restano morbidi, i bordi e i tappi restano netti. Le normali sono nel GLB,
  quindi per i modelli caricati il gioco non deve usare `flatShading`.
- Contorno: nessuno. La lettura viene dal contrasto di valore e dalla luce di taglio (si può riconsiderare dopo la prova sul telefono).

## Luci (riproducibili in three.js r186, sono quelle di `src/gioco/scena.js`)
- `HemisphereLight('#fff6ea', '#c4844e', 0.62)` come riempimento caldo.
- `DirectionalLight('#ffd59a', 2.45)` da (1.1, 2.6, 1.8) come luce principale, con ombre PCF 1024, bias -0.0004 e normalBias 0.04.
- `scene.environment` = `RoomEnvironment` passato in PMREM (riflessi morbidi sui metalli).
- Tone mapping ACES Filmic con exposure 1.08, `outputColorSpace` sRGB, sfondo #F4D2C0.
- Le anteprime sono fatte con Cycles e lo stesso schema: luce chiave calda #FFD59A in alto a destra, riempimento pesca,
  luce di taglio crema e ambiente pesca. Su fondo trasparente con ombra di contatto, poi composte sul gradiente pesca.

## Budget poligoni (triangoli)
| Classe | Budget | Esempi |
|---|---|---|
| attrezzo a mano | 300–1200 | cacciavite, pennellino, lente, pinzette, leva, nastro |
| oggetto da riparare | 1500–3500 | torcia (2368), telecomando, TV |
| personaggio | 3000–6000 | Ettore |
| banco o arredo grande | 1500–4000 | banco, mensola, cassetto |
| piccolo arredo | 100–600 | vasi, barattoli |
| scena intera (telefono) | < 60k tris, < 40 draw call | |

## Convenzioni tecniche
- glTF 2.0 binario (GLB), Y in alto, metri. Le scale e le rotazioni sono applicate. Niente Draco: il gioco non ha un DRACOLoader.
- Scala: per ora è quella non scalata del codice. La torcia è lunga circa 0.26 m e il gioco la ingrandisce con `g.scale = 1.35`.
- Una sola radice vuota per oggetto, con il nome dell'oggetto (`torcia`). I figli si chiamano come gli id che il gioco usa in
  `registra()`: `tappo`, `vite`, `contatto`, `pila_a`, `pila_b`, `vetro`, `macchia`, `sede_a`, `sede_b`, `centro_torcia`.
- I pivot servono al gesto: il tappo ha il pivot sull'asse, alla sede del filetto, e si svita girando su Y e scendendo
  lungo -Y. La vite ha il pivot al centro della testa e gira su Y. Le pile hanno il pivot al centro, il contatto alla sua sede.

## Riferimenti concept con IA
Non ce ne sono. Avevo previsto una o due immagini di atmosfera con fal (modello `google/nano-banana-2.1`, che sulla pagina
fal.ai risulta "licenseType: commercial / Commercial use"; anche `fal-ai/flux-2-pro` risulta commerciale), ma la generazione
è stata rifiutata perché l'account fal ha finito i crediti (403 balance_exhausted). Sulla tavola ci sono solo render Blender originali.

## Provenienza
Il modello è scritto a mano con uno script Python di Blender 4.2.3 LTS (`scripts/torcia.py`). Non usa asset di terzi né IA.
Va bene come voce per `docs/LICENZE_ASSET.md`.
