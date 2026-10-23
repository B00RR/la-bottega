# Design del tutorial

La Bottega si apre già in gioco. Niente menu. Ettore, il maestro, è burbero e gentile: parla in nuvolette, con un borbottio corto, e il giocatore tocca per andare avanti. Finché c’è una frase, non si chiede un gesto.

Il tutorial dura pochi minuti e insegna un attrezzo alla volta. La cassetta mostra solo gli attrezzi già incontrati. Si seleziona l’attrezzo e poi si fa il suo gesto. Se si sbaglia attrezzo, niente si rompe: Ettore corregge con calma. Se si esita qualche secondo, l’attrezzo giusto e il punto pulsano, e compare una mano che non copre né il dialogo né la cassetta.

## Apertura

Bottega al mattino, luce calda. Ettore dice «Ah, sei arrivato.» e «Vediamo se hai le mani buone.» Poi appoggia una torcia sul banco, senza testo sopra, e aggiunge «Tieni. Una torcia che non si accende.» «Prima si guarda.»

## Torcia

1. **Guardare.** Trascinare per girarla. Poi si mette di coda verso chi gioca.
2. **Analizzare.** Arriva la lente. Si passa sul fondo: la macchia ossidata si accende e nel taccuino vola «contatto ossidato».
3. **Smontare.** Cacciavite a croce. Un cerchio, come per aprire un barattolo. Il tappo si apre. La vite resta sul fondo, così si può richiudere.
4. **Riparare.** Pennellino. Si strofina il contatto: l’ossido se ne va un poco alla volta.
5. **Sostituire.** Si trascinano fuori le pile morte, poi dal cassetto si trascinano quelle nuove al loro posto.
6. Si richiude girando al contrario. La torcia si accende. Ettore la punta verso chi gioca.

## Telecomando

Stesso ritmo, meno spiegazioni. La leva scorre lungo la fessura e il guscio fa «clac». La lente trova «filo scoperto» e «molla spostata». Le pinzette riportano la molla nella sede. Il nastro si avvolge girando il dito intorno al filo. Si richiude il guscio e la televisione della bottega si accende.

## Chiusura

«La base ce l’hai. Domani ti mando dalla signora del terzo piano.» Poi la schermata «Fine del tutorial», con Ricomincia.

Il salto del tutorial sta solo nelle impostazioni, in fondo, non in evidenza.

## Come è fatto un oggetto

Tutto il copione è in `src/dati/contenuti.js`. Il motore applica operazioni, non ha un ramo per ogni oggetto.

- `oggetto`: visibile, posa, acceso
- `parte`: aperto, pulizia, scoperta, estratta, inserita, aPosto, avvolto, scoperto
- `indizio`: una riga del taccuino
- `tv` e `cassetto`

I gesti già noti sono: `ruota`, `lente`, `circolare`, `strofina`, `estrai`, `inserisci`, `scorri`, `pinza`, `avvolgi`.

Per aggiungere un oggetto basta descrivere le parti (il disegno sta in `src/gioco/scena.js`, ancora fatto a mano per questi due) e una lista di passi che usano quei gesti e quelle operazioni. Se serve un gesto nuovo, quello sì va scritto nel motore.

Le frasi stanno in `src/dati/testi.js`, per id. Il copione non contiene le frasi.

## Salvataggio

`localStorage`, chiave `la-bottega:salvataggio`, versione 1:

```json
{ "versione": 1, "indice": 0, "linea": 0, "saltato": false }
```

Prima di scrivere si copia la chiave in `la-bottega:salvataggio.bak`. Al ricarico si ricostruisce il banco rieseguendo i passi già chiusi: non si salvano le mesh di three.js, né un gesto a metà. La riga del dialogo sì, così una nuvola interrotta riprende da lì.

L’audio muto sta a parte, in `la-bottega:audio`.

## Vista e input

Camera ferma sul banco. Non c’è OrbitControls: i trascinamenti servono a riparare, non a orbitare. Dito e mouse passano dagli stessi pointer event. Niente gesti a due dita: le pinzette sono «seleziona, poi trascina». Le aree sono larghe. Se il dito esce un attimo, il progresso del cerchio o dello strofinio non si azzera.

La tastiera: Invio e Spazio fanno avanzare il dialogo quando il fuoco non è già su un bottone. I bottoni si possono raggiungere col tabulatore. Reimpostare i tasti non c’entra: le azioni sono gesti.

## Direzione visiva

Low poly, facce piatte, colori pastello caldi. Muro pesca, legno, terracotta, salvia, luce oro. Ettore è originale: testa grande, baffi, grembiule. Nessun disegno di terzi. Niente scosse dello schermo. Il feedback è corto: un tick quando si prende un attrezzo, uno scatto sulla vite, una campanella per l’indizio, un «clac» sul guscio, e alla fine scintille, un arpeggio e un lampo caldo che non copre il testo.
