# Licenze degli asset

Nel gioco non ci sono modelli, texture, font o suoni di terzi.

- Bottega, torcia, telecomando, televisione, cassetto ed Ettore sono geometria procedurale scritta in `src/gioco/scena.js`. Il ritratto nella nuvoletta e le icone degli attrezzi sono SVG originali.
- I suoni sono oscillatori del Web Audio, generati al momento.
- Il carattere è lo stack di sistema (`Segoe UI`, `system-ui`), senza font scaricati.
- La texture della televisione è un canvas disegnato a runtime.

three.js (r186) è una dipendenza di codice, licenza MIT, non un asset grafico. Vedi `package.json`.

Le skill in `.agents/skills/` sono documentazione per gli agenti, copiate da [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills) (Apache-2.0). Non entrano nella build del gioco. Il registro è `skills-lock.json`.
