# La Bottega — stato del progetto

Gioco mobile in italiano: il garzone di un riparatore di quartiere. Ora c'è solo il **tutorial giocabile** (torcia e telecomando), in three.js, pensato per il telefono in verticale.

## Come si prova

- In locale: `npm install`, poi `npm run dev`, e si apre il link sul telefono.
- Build di produzione: `npm run build` e `npm run preview`.
- Prova automatica che **gioca** il tutorial: `npm run test:e2e`.
- Pubblicazione: push su `main`. Il workflow `.github/workflows/pages.yml` pubblica su <https://b00rr.github.io/la-bottega/>.

Il design del tutorial è in `docs/DESIGN_TUTORIAL.md`. Le licenze degli asset sono in `docs/LICENZE_ASSET.md`.

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
| 2 | `threejs-materials-lighting` | PBR, luci, ombre, ambiente procedurale |
| — | `threejs-gltf-loading` | Non usata: i modelli sono geometria procedurale, non glTF |
| 3 | `input-systems` | Gesti come azioni, dito e mouse sullo stesso strato, aree larghe |
| 4 | `game-ui-ux` | Ancore, area sicura, pila di schermate, testi leggibili |
| 5 | `dialogue-systems` | Battute a dati, con id di stringa |
| 6 | `save-systems` | Salvataggio versionato, ricostruito dai dati |
| 7 | `create-game-assets` | Direzione visiva low-poly, pastello caldo, niente asset di terzi |
| 8 | `game-feel` | Feedback breve a livelli, senza scuotere la vista |

## Cosa c'è adesso

Il tutorial si apre in bottega, senza menu. Ettore fa provare la torcia (guardare, analizzare, smontare, riparare, sostituire) e poi il telecomando, con un attrezzo nuovo alla volta. Un oggetto nuovo si aggiunge nei dati in `src/dati/`, non con codice dedicato.

Il progresso sta in `localStorage` (`la-bottega:salvataggio`, versione 1) e un ricaricamento riprende il passo corrente.
