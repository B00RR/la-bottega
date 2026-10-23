# Licenze degli asset

Nel gioco non ci sono modelli, texture, font o suoni di terzi.

- I segnaposto disegnati dal codice (bottega, torcia, telecomando, attrezzi, televisione, cassetto ed Ettore) sono geometria procedurale in `src/gioco/scena.js`, `src/gioco/modelli.js` e `src/gioco/torcia.js`. I file in `public/modelli/` sono i GLB approvati che li sostituiscono. Il ritratto nella nuvoletta e le icone degli attrezzi sono SVG originali.
- `public/modelli/torcia.glb` è un modello originale per La Bottega, generato con Blender 4.2 dallo script `strumenti/modelli/torcia.py` (con `comune.py`), nessun asset di terzi, nessuna AI, stessi diritti del progetto. La scritta «2019» è geometria ricavata da DejaVu Sans Bold (licenza DejaVu/Bitstream Vera, libera); nel file non c'è nessun font.
- `public/modelli/telecomando.glb` è un modello originale per La Bottega, generato con Blender 4.2 dallo script `strumenti/modelli/telecomando.py`, nessun asset di terzi, nessuna AI, stessi diritti del progetto.
- `public/modelli/lente.glb`, `cacciavite.glb`, `pennellino.glb`, `leva.glb`, `pinzette.glb` e `nastro.glb` sono modelli originali per La Bottega, generati con Blender 4.2 dagli script omonimi in `strumenti/modelli/`, nessun asset di terzi, nessuna AI, stessi diritti del progetto.
- `public/modelli/banco.glb` è un modello originale per La Bottega, generato con Blender 4.2 dallo script `strumenti/modelli/banco.py`, nessun asset di terzi, nessuna AI, stessi diritti del progetto.
- I suoni sono oscillatori del Web Audio, generati al momento.
- Il carattere è lo stack di sistema (`Segoe UI`, `system-ui`), senza font scaricati.
- La texture della televisione è un canvas disegnato a runtime.

three.js (r186) è una dipendenza di codice, licenza MIT, non un asset grafico. Vedi `package.json`.

Le skill in `.agents/skills/` sono documentazione per gli agenti, copiate da [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) (Apache-2.0). Non entrano nella build del gioco. Il registro è `skills-lock.json`.
