# La Bottega — stato del progetto

Gioco mobile in italiano: il garzone di un riparatore di quartiere. Ora c'è solo il **tutorial giocabile** (torcia e telecomando), in three.js, pensato per il telefono in verticale.

## Come si prova

- In locale: `npm install`, poi `npm run dev`, e si apre il link sul telefono.
- Build di produzione: `npm run build` e `npm run preview`.
- Prova automatica che **gioca** il tutorial: `npm run test:e2e`.
- Pubblicazione: push su `main`. Il workflow `.github/workflows/pages.yml` pubblica su <https://b00rr.github.io/la-bottega/>.

Il copione dei primi istanti è in `docs/PRIMI_ISTANTI.md`. `docs/DESIGN_TUTORIAL.md` resta la storia della v1. Le licenze degli asset sono in `docs/LICENZE_ASSET.md`.

## Skill per gli agenti

Ogni agente che lavora su questo repo parte dallo **skill router** e carica solo le skill che servono al compito.

Sono installate a livello di progetto (non globali) con:

```bash
npx skills add gamedev-skills/awesome-gamedev-agent-skills -a cursor -s '*' -y --copy
```

Percorso: `.agents/skills/` (Cursor lo legge anche come skill di progetto). Il registro è `skills-lock.json`. Fonte: [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills), licenza Apache-2.0. Sono 77 skill, router compreso.

Per questo tutorial il router ha indicato:

| Ordine | Skill | Perché |
| --- | --- | --- |
| 1 | `threejs-scene-setup` | Scena, camera, renderer, ciclo `setAnimationLoop`, three **r186** |
| 2 | `threejs-materials-lighting` | Due luci, niente ombre né post-processing: il budget dei primi istanti vince sullo stile |
| 3 | `threejs-gltf-loading` | `public/modelli/torcia.glb` per nome nodo, con riserva procedurale |
| 4 | `input-systems` | Gesti come azioni, dito e mouse sullo stesso strato, aree larghe |
| 5 | `game-ui-ux` | Ancore, area sicura, pila di schermate, testi leggibili |
| 6 | `dialogue-systems` | Battute a dati, con id di stringa |
| 7 | `save-systems` | Salvataggio versionato, ricostruito dai dati |
| 8 | `create-game-assets` | Direzione visiva low-poly, pastello caldo |
| 9 | `game-feel` | Feedback breve a livelli, senza scuotere la vista |

## Cosa c'è adesso

Il tutorial segue `docs/PRIMI_ISTANTI.md`: saracinesca, torcia (il tappo si svita sull'asse del GLB), telecomando, chiusura nella finzione. Ettore non si nomina sulla bolla. Una bolla non fa avanzare il passo. Il copione nel tutorial è di 158 parole.

La torcia arriva da `public/modelli/torcia.glb`. Telecomando, attrezzi e banco restano procedurali finché non arrivano i loro GLB. Il progresso sta in `localStorage` (`la-bottega:salvataggio`, versione 2, con copia `.bak`). Un salvataggio della v1 ricomincia da capo.

## Verifica

`npx playwright test` sul ritratto touch 390×844 arriva a «Domani» con torcia e telecomando, e i test T1, T3, T4, T5, T6, T7, T8, T9, T13 e T14 passano. Il salto dalle impostazioni passa anche sul laptop 1280×800, che non va in pausa. Il dito di prova tocca solo bersagli dentro lo schermo.

Non sono state fatte le prove umane T2, T10, T11 e T12, né la misura dei 55 fps su un Android vero. In headless, con DPR 1, il budget di triangoli, draw call e 20 fps tiene.
