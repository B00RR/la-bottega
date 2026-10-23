# La Bottega: tavola di stile v1 (APPROVATA) + aggiornamento set 1

Campione di stile: la torcia (`out/torcia.glb`, sorgente `scripts/torcia.py`).
Tavola: `out/tavola_stile.png` (approvata da Lorenzo: il tappo si svita sull'asse).
Set 1 costruito con le stesse regole: torcia (v2), telecomando, 6 attrezzi, banco. Vedi `out/verifica_set.md`.

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
| cacao | #3C291C | il tono più scuro: incavi e occhi, scritta «2019» (nel codice: `inchiostro`) |
| interno | #7A3E2C | interni cavi (vano pile) |

Aggiunte del set 1 (stessa famiglia calda, nessun colore freddo):
| Nome | Hex | Ruolo |
|---|---|---|
| nocciola | #6B4E3D | gusci del telecomando (scuro, così i tasti pastello si leggono) |
| legno chiaro | #D29A62 | assi alterne del banco, cassetto |
| legno scuro | #9A5F38 | gambe, grembiule e fughe del banco, interno cassettiera |
| foglia | #93C47D | pile nuove (prende il posto di #7DBE6E) |
| rame | #D08A3A | rame scoperto del filo |
| rosso | #C4623A | tasto ON, LED |
| carta | #E9D9BE | anima del nastro, setole, cassettiera |
| grafite | #5A4A40 | guaina del filo, finestra IR, chip, punta delle setole |

## Materiali (aggiornato per il budget del set 1)
- **I colori stanno nei vertici, non nei materiali.** Ogni faccia porta il colore della palette in un attributo colore
  per angolo (`Col`, nel glTF `COLOR_0`). GLTFLoader lo vede e mette da solo `material.vertexColors = true`.
- Tutto il set usa **due materiali condivisi**: `bottega_opaco` (roughness 0.62, metalness 0: plastica, legno, stoffa,
  carta) e `bottega_metallo` (roughness 0.35, metalness 0.7: acciaio, argento). Quindi una mesh costa 1 draw call,
  oppure 2 se mescola facce opache e metalliche. I metalli piccoli (poli delle pile, contatti del telecomando, ghiera
  del pennellino) sono dipinti color argento ma restano in `bottega_opaco`, così non aggiungono una draw call.
- Materiali propri **solo** dove il gioco cambia il colore o la trasparenza: `torcia_vetro` (emissive acceso dal
  codice), `torcia_ossido` (macchia), `torcia_contatto` (molla verde che il pennellino pulisce, da #6E8B4E a #C5C8CC),
  `lente_vetro` (vetro della lente, alpha 0.35). Sono 6 materiali in tutto il set.
- Per evidenziare un pezzo (contorno o pulsazione) il gioco clona il materiale di quella mesh a runtime
  (`mesh.material = mesh.material.clone()`). Non serve un materiale per pezzo nel GLB.
- Niente texture, nemmeno per le scritte: «2019» sulle pile è geometria (circa 240 tris per pila).
- L'emissive è solo un feedback di gioco ed è il codice ad accenderlo. Nel GLB resta a 0.
- Bevel: smussi da 1–2 segmenti, da 1 a 7 mm, già nel modello. Shading smooth by angle a 30–50°, normali nel GLB, niente `flatShading`.
- Contorno: nessuno.

## Luci (riproducibili in three.js r186, sono quelle di `src/gioco/scena.js`)
- `HemisphereLight('#fff6ea', '#c4844e', 0.62)` come riempimento caldo.
- `DirectionalLight('#ffd59a', 2.45)` da (1.1, 2.6, 1.8) come luce principale, con ombre PCF 1024, bias -0.0004 e normalBias 0.04.
- `scene.environment` = `RoomEnvironment` passato in PMREM (riflessi morbidi sui metalli).
- Tone mapping ACES Filmic con exposure 1.08, `outputColorSpace` sRGB, sfondo #F4D2C0.
- Le anteprime sono fatte con Cycles e lo stesso schema: luce chiave calda #FFD59A in alto a destra, riempimento pesca,
  luce di taglio crema e ambiente pesca. Su fondo trasparente con ombra di contatto, poi composte sul gradiente pesca.

## Budget (vincolante, da PRIMI_ISTANTI §4.5): scena intera < 40k triangoli e < 50 draw call
Draw call = mesh × materiale (primitive nel glTF). Ripartizione:
| Voce | Triangoli | Draw call | Note |
|---|---|---|---|
| set 1: torcia, telecomando, 6 attrezzi, banco | ≤ 12 000 | ≤ 32 | misurato: vedi `verifica_set.md` |
| Ettore | ≤ 6 000 | ≤ 4 | colori nei vertici, 1–2 materiali |
| stanza (muro, pavimento, mensole, TV, piante) | ≤ 8 000 | ≤ 8 | statica: `mergeGeometries` in una o due mesh |
| particelle, sprite (bagliore, fascio), nuvolette 3D | ≤ 2 000 | ≤ 4 | pool di particelle = 1 draw (InstancedMesh/Points) |
| margine | ≥ 12 000 | ≥ 2 | |
| **totale** | **< 40 000** | **< 50** | |
Per singolo asset: attrezzo 150–700 tris e 1–2 draw call; oggetto da riparare 2 000–3 500 tris e ≤ 10 draw call;
banco ≤ 2 500 tris e ≤ 5 draw call. Le parti che si muovono restano mesh separate (servono i pivot); tutto il
resto di un oggetto si unisce in una mesh. Attenzione: con le ombre accese ogni mesh che proietta ombra viene
disegnata una seconda volta nella shadow map. Conviene `castShadow` solo sugli oggetti in mano e sul banco,
oppure ombre «blob» finte come previsto da §4.5.

## Convenzioni tecniche
- glTF 2.0 binario (GLB), Y in alto, metri. Le scale e le rotazioni sono applicate. Niente Draco: il gioco non ha un DRACOLoader.
- **Scala unica per tutto il set:** le unità sono quelle non scalate del codice (la torcia è lunga 0.26 m). Il gioco
  applica **1.35 a tutti gli asset** (o alla radice della scena), così il banco torna a 1.08 × 0.62 m come in `scena.js`.
  Il telecomando oggi ha scala 1.45: con il GLB diventa 1.35 come il resto (il modello è già un po' più grande).
- **y = 0 è la superficie del panno verde** al centro del banco (`centro_banco`). Il piano di legno è a y = -0.004.
- Una sola radice vuota per oggetto, col nome dell'oggetto. I figli si chiamano come gli id di `registra()` quando
  esistono, sennò in italiano snake_case. Le parti che si muovono sono nodi separati con il pivot sul punto di
  rotazione o scorrimento. I punti di gioco senza geometria (sedi, centri, gancetti) sono nodi vuoti.
- Gli attrezzi sono modellati «in mano»: punta sull'origine, manico verso +Y. La lente invece ha l'origine al centro
  del vetro, che guarda +Z (la camera), e il manico verso -Y.
- La parte davanti del banco guarda +Z (la camera). Il telecomando ha la fronte IR verso -Z (verso la TV) e la fessura sul lato +X.

## Riferimenti concept con IA
Non ce ne sono. Avevo previsto una o due immagini di atmosfera con fal (modello `google/nano-banana-2.1`, che sulla pagina
fal.ai risulta "licenseType: commercial / Commercial use"; anche `fal-ai/flux-2-pro` risulta commerciale), ma la generazione
è stata rifiutata perché l'account fal ha finito i crediti (403 balance_exhausted). Sulla tavola ci sono solo render Blender originali.

## Provenienza
Ogni modello è scritto a mano con uno script Python di Blender 4.2.3 LTS (`scripts/<asset>.py` più `scripts/comune.py`
per palette, materiali e funzioni condivise). Non usa asset di terzi né IA: niente fal, niente librerie esterne.
La scritta «2019» usa DejaVu Sans Bold (licenza DejaVu/Bitstream Vera, libera anche per uso commerciale), convertita in
geometria: nel GLB non c'è nessun file di font. Va bene come voce per `docs/LICENZE_ASSET.md`.
