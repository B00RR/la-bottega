# La Bottega: i primi istanti

**Cosa copre:** dall'apertura del link alla fine del primo oggetto (Torcia), secondo per secondo. Il Telecomando e la chiusura sono più leggeri. Durata obiettivo: circa 3:20.
**Vale per:** mobile verticale (riferimento 390×844 CSS px), three.js, low poly pastello caldo.
**Sostituisce:** `docs/DESIGN_TUTORIAL.md` della v1 (main 156ab5f) per tutto ciò che riguarda flusso, tempi, testi e feedback.

---

## 0. Perché la v1 non funziona (in una riga ciascuno)

| Problema v1 | Conseguenza | Regola nuova |
|---|---|---|
| «Finché c'è una frase, non si chiede un gesto» + «tocca per continuare» | 4 nuvolette prima del primo gesto vero, si legge invece di giocare | Il primo tocco è sull'oggetto. Le nuvolette non bloccano mai l'input (§2.5) |
| Etichette verbo («Analizzare») + righe `istr.*` scritte | Testo da manuale, doppione di Ettore | Niente istruzioni scritte. Solo la mano fantasma dopo un'esitazione (§2.6) |
| Il gesto circolare perde progresso mentre l'oggetto si muove ancora | Il giocatore crede di sbagliare | Lo step si attiva solo dopo l'evento «fermo». Il gesto è misurato sulla posizione proiettata a ogni frame (§4.2) |
| Contatto della torcia in alto, vicino ai bottoni | Mira scomoda, il pollice copre, conflitto con l'HUD | «Zona calda» fissa per il bersaglio attivo (§5.1) |
| Un gesto lasciato a metà non si salva al ricarico | Si rifà la fatica | Il progresso del gesto viene salvato (§4.4) |
| ~4 fps a pixel ratio 2 (headless) | Rischio concreto sui telefoni medi | Budget di prestazioni, DPR limitato e adattivo (§4.5) |
| La battuta per l'attrezzo sbagliato falliva in silenzio | Errore senza risposta, quindi confusione | Test di avvio: ogni id di battuta esiste, e ogni errore ha una risposta entro 300 ms (§8) |
| Schermata «Fine del tutorial / Ricomincia» | Rompe la finzione proprio sul finale | Si chiude nella finzione: saracinesca e «Domani» (§3.3) |
| Camera fissa, nessuna orbita | Giusto, si tiene | Inquadrature fisse per step, con passaggi brevi tra l'una e l'altra (§5.2) |

---

## 1. Principi guida (8)

1. **Si tocca l'oggetto entro 10 secondi.** Niente splash, menu o consensi prima del gioco. Il «titolo» è la saracinesca della bottega, e alzarla è già un gesto. *Rif.:* Apple, [Onboarding for Games](https://developer.apple.com/app-store/onboarding-for-games/) («Start onboarding at launch… avoid splash screens, menus»). Google Play: nel quartile peggiore dei top-grossing il 46% dei nuovi giocatori se ne va entro il minuto 5, contro il 17% del quartile migliore ([Google Play Apps & Games, «Why the first ten minutes is crucial»](https://medium.com/googleplaydev/why-the-first-ten-minutes-is-crucial-if-you-want-to-keep-players-coming-back-to-your-mobile-game-4a89031b6308)).
2. **Il guasto lo scopre il giocatore.** Prima azione: premere il bottone della torcia, che non si accende. Il gioco si capisce in un secondo: «c'è una cosa rotta, la devo far ripartire». Ultima azione: lo stesso bottone, e stavolta luce. *Rif.:* Portal, che fa capire il portale facendo vedere al giocatore se stesso attraverso il primo portale (commento di Kim Swift, [developer commentary](https://www.combineoverwiki.net/wiki/Developer_commentary/Portal)). A Little to the Left, che «non spiega mai le sue regole» ([littletotheleftgame.com](https://littletotheleftgame.com/tips.html)).
3. **Un verbo nuovo alla volta, poi lo si ripete senza parole.** Ogni attrezzo viene presentato una volta sola. La seconda volta Ettore sta zitto. *Rif.:* Portal, Chris Chin: un test «introduceva troppi concetti nuovi insieme», e hanno aggiunto due camere prima. Kim Swift: «Overwhelmed players tend not to digest new information» ([commentary](https://www.combineoverwiki.net/wiki/Developer_commentary/Portal)). In Trash Tycoon il 60% abbandonava il tutorial perché si saltava da una meccanica all'altra ([Supersonic](https://supersonic.com/learn/blog/optimizing-ftue/)). Apple: «teach one step at a time».
4. **Kishōtenketsu.** Torcia: *ki* guardare, *shō* aprire e pulire, *ten* sorpresa (dentro ci sono due guasti, non uno), *ketsu* chiudere e accendere. Rispetto all'intero tutorial il Telecomando è il *ten*: gli stessi verbi in un contesto nuovo, la lente dentro invece che fuori, due indizi. *Rif.:* Koichi Hayashida su Mario ([Game Developer](https://www.gamedeveloper.com/design/the-secret-to-i-mario-i-level-design)).
5. **Ettore parla mentre fai, mai al posto tuo.** Al massimo 8 parole per nuvoletta. Le nuvolette non si chiudono a tocco e non bloccano nulla. Ettore commenta e scherza, non dà istruzioni da manuale. *Rif.:* Portal, «Story must never intrude on gameplay… Less is more» ([post-mortem GDC 2008](https://cdn.fastly.steamstatic.com/apps/valve/2008/GDC2008_PortalPostMortem.pdf)). Monument Valley dà due sole istruzioni di poche parole in tutto il gioco ([Mechanics of Magic](https://mechanicsofmagic.com/2025/05/09/a-monumental-valley-of-puzzles-too-much-of-a-stretch/), [Critical Play](https://medium.com/game-design-fundamentals/critical-play-monument-valley-696efabf4e2e)).
6. **L'aiuto sale a gradini, e solo dopo un'esitazione.** Prima il punto pulsa, poi compare una mano fantasma, infine parla Ettore. Mai subito. *Rif.:* A Little to the Left ha suggerimenti visivi progressivi, e decide il giocatore quanto farsi aiutare ([Puzzlebyrinth](https://puzzlebyrinth.com/reviews/a-little-to-the-left)). Portal: «When all else fails great dialogue is an excellent hint» ([post-mortem](https://cdn.fastly.steamstatic.com/apps/valve/2008/GDC2008_PortalPostMortem.pdf)).
7. **Non si fallisce mai: lo sbaglio diventa una battuta.** Niente si rompe, niente si azzera. *Rif.:* Unpacking, «no scores, no time limits, no fail states» ([GDC Vault](https://gdcvault.com/play/1029400/-Unpacking-Zen-Designing-a)). Assemble with Care è indulgente per scelta ([Polygon](https://www.polygon.com/reviews/2019/10/1/20893203/assemble-with-care-us-two-games-impressions-apple-arcade/)). Portal: «Players learn better when not stressed».
8. **Il gesto è l'azione, su un solo asse alla volta, e il feedback è proporzionato.** Si svita girando, si pulisce strofinando, si tira fuori trascinando. Mai due dita e mai rotazioni libere in 3D. *Rif.:* Florence è passato dai puzzle 3D a gesti touch semplici che «evocano una sensazione» ([Game Developer](https://www.gamedeveloper.com/design/how-simple-mechanics-and-vignettes-inspired-i-florence-i-), [Game Informer](https://gameinformer.com/gdc-2019/2019/03/20/florence-started-development-as-3d-rubiks-cube-of-human-heads)). In Assemble with Care si gira l'oggetto e si svita col dito ([Polygon](https://www.polygon.com/reviews/2019/10/1/20893203/assemble-with-care-us-two-games-impressions-apple-arcade/)). Feedback a livelli (piccolo, medio, grande) dalla skill `game-feel`.

---

## 2. Regole di sistema (valgono per ogni beat)

### 2.1 Ciclo di uno step
`entra` (camera e oggetto si muovono, ≤ 600 ms) → evento **`fermo`** → step **attivo** (parte il timer di esitazione, i gesti contano) → `successo` (feedback, l'attrezzo torna da solo nella cassetta) → step seguente.
Il gioco non resta mai più di **2 s di fila** senza accettare input. In tutto il tutorial non ci sono più di **12 s** senza input possibile.

### 2.2 Attrezzi
- Si tocca lo slot nella cassetta: l'attrezzo si solleva (tick, 8 ms di vibrazione), lo slot si illumina e l'attrezzo va «in mano». Poi si fa il gesto **sull'oggetto**.
- A step riuscito l'attrezzo torna da solo nella cassetta. **Senza attrezzo il dito è la mano**: si preme, si gira l'oggetto, si trascinano i pezzi.
- La cassetta mostra solo gli attrezzi già incontrati. Ogni nuovo attrezzo entra con un pop (TRANS_BACK, 250 ms).

### 2.3 Gerarchia degli aiuti (in secondi di esitazione)
L'esitazione è il tempo trascorso da quando lo step è attivo, o dall'ultimo input utile, senza progresso.

| Livello | Verbo nuovo | Verbo già visto | Cosa appare |
|---|---|---|---|
| A1 | 4 s | 6 s | Prima l'attrezzo giusto pulsa (se non è in mano), poi il punto giusto: scala 1→1,06, contorno caldo, 1,2 s di ciclo |
| A2 | 7 s | 10 s | Mano fantasma semitrasparente che mima il gesto **esatto** per due giri, poi sparisce. Non copre mai il punto: sta sfalsata di 40 px |
| A3 | 13 s | 16 s | Una battuta di Ettore «aiuto» (§3, riga *A3*) |

Un errore conta come esitazione: fa partire subito A1 sul punto giusto.

### 2.4 Errori (sempre: niente si rompe e niente si azzera)
- **Attrezzo sbagliato sull'oggetto:** l'attrezzo rimbalza («tonk» sordo), l'oggetto ha un piccolo sussulto (squash 0,95, 120 ms) e Ettore dice una battuta da *corr* (3 varianti a rotazione, mai la stessa due volte di fila). L'attrezzo giusto pulsa subito.
- **Punto sbagliato:** un «tic» morbido e un piccolo sbuffo di polvere. Dal secondo errore il punto giusto pulsa.
- **Gesto sbagliato con l'attrezzo giusto:** risposta specifica, scritta nel beat.
- Risposta audio e visiva **entro 300 ms**. Se manca la battuta, il gioco la segnala in console all'avvio (vedi test T8).

### 2.5 Nuvolette
- Al massimo **8 parole** (limite assoluto 10) e **una riga**, due solo su schermi < 360 px.
- Durata a schermo: 1,2 s + 60 ms per carattere (minimo 1,8 s). Un tocco sulla nuvoletta completa il testo, un secondo tocco la chiude. **Non servono mai per andare avanti.**
- Al massimo 2 nuvolette consecutive senza che il giocatore faccia nulla.
- Il borbottio: un blip ogni 2 caratteri, con il tono di base di Ettore (basso, caldo) ± 6% a caso. Mentre parla, la musica scende di 6 dB.
- Posizione: sempre nella fascia alta (§5.1), coda verso Ettore. Se Ettore è fuori campo, la coda punta al medaglione di Ettore in alto a sinistra. La nuvoletta non tocca mai il rettangolo proiettato del bersaglio attivo né la cassetta. Se lo tocca, cambia ancoraggio.

### 2.6 Niente testo d'interfaccia nel tutorial
Nessuna etichetta di verbo, nessuna riga d'istruzione, nessun «tocca per continuare». L'unico testo che non viene da Ettore sono i nomi degli indizi nel taccuino (2 parole) e il cartello «La Bottega».

---

## 3. Copione

Notazione per ogni beat: **Vede** (inquadratura), **Ettore** (testo esatto), **Tocca/Gesto**, **Feedback** (V visivo, S suono, H vibrazione), **Aiuti**, **Errore**, **Successo**.
H = `navigator.vibrate` in ms (Android). Su iOS Safari la Vibration API non c'è, quindi il suono deve bastare da solo.

### 3.1 Apertura e Torcia (0:00 → ~2:05)

**B0 · 0:00–0:01 · Caricamento = la saracinesca**
- Vede: in HTML e CSS (visibile in < 0,5 s, prima di three.js) la saracinesca abbassata di una bottega, il cartello «La Bottega · Riparazioni» e una maniglia al centro in basso. Il caricamento è una lama di luce calda sotto la saracinesca che si allarga.
- Ettore: niente.
- S: nessuno. L'audio non può partire senza un gesto dell'utente.
- Successo: asset pronti, e la maniglia fa un piccolo saltello.

**B1 · ~0:01–0:04 · Primo gesto: alzare la saracinesca**
- Tocca/Gesto: **trascinare verso l'alto** la maniglia (la saracinesca segue il dito 1:1). Anche un **tap** va bene: la saracinesca sale da sola con un piccolo rimbalzo.
- Feedback: V la saracinesca si arrotola e la luce entra. S sferragliare metallico (il primo suono, che sblocca l'AudioContext), poi il campanello della porta. H 10.
- Aiuti: dopo 2,5 s compare una freccia ↑ disegnata col gesso sulla saracinesca e la maniglia saltella. Mai testo.
- Errore: non esiste. Qualsiasi tocco va bene.
- Successo: saracinesca oltre il 40%, il resto sale da solo.

**B2 · 0:04–0:06 · Entrata**
- Vede: dolly della camera in avanti attraverso la porta fino al banco (1,6 s, ease-in-out sine). Inquadratura **BANCO**: banco in basso al centro, Ettore dietro (testa e spalle nella fascia alta) col giornale, la torcia sdraiata al centro della zona calda con il bottone rivolto alla camera.
- S: l'ambiente della strada sfuma in quello interno (radiolina lontana, orologio). Si sente la stanza.
- Input: bloccato per 1,6 s (è l'unico blocco lungo prima della fine della torcia).

**B3 · 0:06–0:08 · Ettore**
- Vede: Ettore abbassa il giornale e con un dito spinge la torcia di 5 cm verso il giocatore. La torcia rotola e si ferma con un piccolo rimbalzo. Poi `fermo`.
- Ettore: «Ah, sei tu. Puntuale, quasi.» poi «Questa non si accende.»
- S: borbottio. La musica non c'è ancora: arriva al primo successo.

**B4 · 0:08–0:12 · Primo tocco: il bottone (verbo: premere)**
- Tocca/Gesto: **tap** sul bottone della torcia (area di tocco 72 px, più grande del modello).
- Feedback: V il bottone affonda di 2 mm e risale, la lampadina resta spenta, piccolo zoom di 3% sulla lampadina. S «clic» secco seguito dal silenzio, voluto. H 10.
- Ettore (dopo il tap): «Appunto. Morta.»
- Aiuti: A1 a **3 s** (il bottone pulsa), A2 a 6 s (mano fantasma che preme), A3 a 11 s: «Il bottone. Prova, non morde.»
- Errore: tap sul corpo della torcia: un piccolo «toc», e il bottone pulsa subito.
- Successo: 1 tap. **Metrica:** primo tocco utile ≤ 0:12.

**B5 · 0:12–0:22 · Girare l'oggetto (verbo: girare, solo con la mano)**
- Ettore: «Girala. Gli oggetti parlano.»
- Tocca/Gesto: **trascinare in orizzontale** sulla torcia, che ruota **solo sull'asse verticale** (0,6° per px, senza inerzia).
- Feedback: V rotazione 1:1. Quando la coda della torcia è a meno di 25° dalla camera **scatta in posizione** (molla smorzata, 250 ms) e si vede una crosticina verdina sul bordo del tappo. S fruscio di plastica sul legno mentre gira, «toc» allo scatto. H 8 allo scatto.
- Ettore (allo scatto): «Mh. Vedi quel verdino?»
- Aiuti (verbo nuovo): A1 4 s (due archi ⟲ attorno alla torcia), A2 7 s (mano fantasma che trascina), A3 13 s: «Trascina col dito. Falla girare.»
- Errore: trascinamento verticale: la torcia si inclina al massimo di 5° e torna giù con una molla. Si capisce che l'asse è un altro, senza dirlo.
- Successo: coda inquadrata. La camera va a **DETTAGLIO-CODA** (500 ms) e la coda finisce al centro della zona calda.

**B6 · 0:22–0:38 · Lente (primo attrezzo, prima UI)**
- Vede: dal bordo basso sale la **cassetta** con un solo slot. Ettore ci posa la lente («tac»).
- Ettore: «La lente. Prima si guarda.»
- Tocca/Gesto: tap sullo slot della lente, poi **trascinare il dito sulla torcia**. La lente segue il dito **70 px più in alto**, così il dito non la copre. Dentro la lente (render target 256²) il dettaglio è ingrandito ×2.
- Feedback «caldo/freddo»: avvicinandosi alla crosticina il bordo della lente si scalda (dal grigio all'oro) e un ronzio sale di tono. Dopo 0,4 s sopra il punto: S campanellino, V la crosticina viene contornata e una **scheda-indizio** (icona + «contatto ossidato») vola con un arco di 500 ms in basso a sinistra, dove nasce il **taccuino** (seconda UI). H 15.
- Ettore: «Ossido. Le pile hanno pianto.»
- Aiuti: lente non presa: A1 4 s sullo slot, A2 7 s (mano fantasma che tocca lo slot). Lente presa ma ferma: A2 7 s (mano fantasma che la trascina sul tappo). Lente che vaga da più di 8 s: la crosticina si schiarisce del 30%. A3 13 s: «Lì, sul tappo. Avvicina.»
- Errore: tap sulla torcia senza lente: la torcia fa un sussulto. Dal secondo: «Prima la lente, ragazzo.»
- Successo: indizio nel taccuino. **Primo successo** ≤ 0:40. Entra la musica: primo strato, chitarra pizzicata a −18 dB.

**B7 · 0:38–0:58 · Cacciavite (verbo: svitare girando)**
- Vede: inquadratura **DETTAGLIO-VITE** (la vite del tappo al centro esatto dello schermo). Nella cassetta entra il cacciavite a croce.
- Ettore: «Apriamo. Cacciavite a croce.»
- Tocca/Gesto: tap sullo slot, poi un **cerchio in senso antiorario** attorno alla vite. Basta avvicinare il dito: entro 80 px la punta aggancia da sola la vite. Si conta l'angolo dal centro proiettato della vite, ricalcolato a ogni frame, in una corona da 24 a 180 px. Ogni salto oltre 45° in un frame si scarta. Servono **540°** (un giro e mezzo).
- Feedback: V un anello di progresso attorno alla testa si riempie e la vite sale di 1 mm per giro. S un «tic» per ogni quarto di giro, con tono che sale leggermente. H 6 per quarto. Sulla testa, appena il cacciavite aggancia, compare una freccia ⟲ incisa (indicazione nel mondo, non HUD).
- Aiuti (verbo nuovo): A1 4 s, A2 6 s (mano fantasma che gira in senso antiorario), A3 12 s: «Gira. Come per aprire un barattolo.»
- Errore: senso orario: niente progresso, scricchiolio «cric», la freccia lampeggia. Dopo 180° in senso orario: «Al contrario. A sinistra si svita.» Il progresso fatto **resta**.
- Successo: la vite salta fuori con uno squash, cade nel vassoietto a sinistra del banco («tin»), il tappo si apre con un «clac». Livello piccolo: 4 scintille, H 12.

**B8 · 0:58–1:18 · Il colpo di scena e il pennellino (verbo: strofinare)**
- Vede: **DETTAGLIO-TAPPO-APERTO**. La molla di contatto sul tappo è verde. Nel tubo ci sono due pile vecchie con la scritta «2019» ben leggibile.
- Ettore: «Due guasti. Del 2019, pure.» Il secondo indizio, «pile morte», entra da solo nel taccuino: l'oggetto ha più di un problema (*ten*).
- Ettore: «Prima il contatto. Pennellino.» Nella cassetta entra il pennellino.
- Tocca/Gesto: tap sullo slot, poi **strofinare avanti e indietro** sulla molla, entro un raggio di 90 px. Il progresso cresce con la strada percorsa nell'area (100% ≈ 1400 px, cioè 6–8 passate, circa 3 s), con un bonus a ogni cambio di direzione.
- Feedback: V la crosticina si consuma in 4 fasi visibili e da ogni passata partono 3–4 particelle di polvere verde. S «sh-sh» il cui tono segue la velocità. H 5 a ogni cambio di direzione.
- Aiuti (verbo nuovo): A1 4 s, A2 6 s (mano fantasma che va avanti e indietro), A3 12 s: «Avanti e indietro. Senza paura.»
- Errore: solo tap senza strofinare: le setole fanno «tic». Dopo il terzo: «Strofina, non bussare.»
- Successo: il metallo brilla (riflesso che passa), campanellino, l'indizio «contatto ossidato» viene spuntato a mano nel taccuino. Livello piccolo: 8 scintille, H 15. Ettore: «Ecco. Brilla.»

**B9 · 1:18–1:30 · Pile fuori (verbo: trascinare, solo con la mano)**
- Ettore: «Ora quelle due. Fuori.»
- Tocca/Gesto: **trascinare** una pila fuori dal tubo (presa entro 60 px; la pila sta 30 px sopra il dito). Si lascia ovunque sul banco e la pila va da sola nel vassoietto delle vecchie. Per la **seconda pila Ettore non dice niente**: è ripetizione.
- Feedback: V la pila scorre fuori, con un attrito iniziale e poi uno scatto. S «sfff» seguito da «tlac» nel vassoietto. H 8.
- Aiuti: A1 4 s, A2 7 s, A3 13 s: «Tirala, dai. Non è incollata.»
- Errore: se la pila viene lasciata dentro il tubo, ci torna dentro con un piccolo rimbalzo. Nessuna battuta.
- Successo: tubo vuoto.

**B10 · 1:30–1:42 · Pile nuove (stesso verbo, nuova destinazione)**
- Vede: il cassetto a destra del banco si apre da solo con due pile nuove lucide.
- Ettore: «Nuove. Dal cassetto.»
- Tocca/Gesto: trascinare dal cassetto al tubo. Scatta in sede entro 70 px e la polarità si sistema da sola (non è una meccanica). La seconda pila, ancora in silenzio.
- Feedback: V squash all'inserimento. S «tump». H 12.
- Errore: pila lasciata fuori: torna fluttuando al cassetto in 300 ms. Alla seconda volta: «Dentro il tubo, ragazzo.»
- Successo: due pile in sede, campanellino, l'indizio «pile morte» viene spuntato. Livello piccolo.

**B11 · 1:42–1:54 · Richiudere (verbo già visto: è la prima vera scelta)**
- Vede: il tappo si richiude da solo e torna **DETTAGLIO-VITE**. Nella cassetta ci sono 3 attrezzi.
- Ettore: «Richiudi. Stavolta a destra.»
- Tocca/Gesto: scegliere il cacciavite tra tre, poi un cerchio in **senso orario**, 360°.
- Aiuti (già visto): A1 6 s, A2 10 s, A3 16 s: «Il cacciavite. Giro al contrario.»
- Errore: lente o pennellino sulla vite, oppure senso antiorario: battute da *corr* (§3.4).
- Successo: la vite si stringe con un ultimo «toc» più grave, e la camera torna a **BANCO** con la torcia di nuovo col bottone in vista.

**B12 · 1:54–2:05 · La prova (stesso tocco di B4)**
- Ettore: «E adesso, il momento.»
- Tocca/Gesto: tap sul bottone. Aiuti A1 solo dopo 5 s.
- Feedback, livello grande: V la luce si accende e il fascio, puntato su Ettore, gli illumina la faccia. Lui strizza gli occhi e alza una mano. Il banco si scalda di colore e nel fascio danzano granelli di polvere (particelle in un pool). Bagliore finto con uno sprite, niente post-processing. S «clic», poi un ronzio caldo della lampadina e un arpeggio di 4 note (celesta e chitarra). H 20-40-30.
- Ettore: «Ahi! Non in faccia!» poi «Mh. Mani buone.»
- Taccuino: si apre da solo per 2 s, con un timbro «RIPARATO» sul disegno della torcia. Entra il secondo strato musicale.
- Successo: la torcia resta accesa, appoggiata sul banco a fare luce. Rimane in scena come trofeo.

### 3.2 Telecomando (~2:05 → ~3:15): schema

Meno parole, aiuti A1/A2/A3 a **6/10/16 s** per i verbi già visti, **4/7/13 s** per quelli nuovi.

| # | Tempo | Ettore | Gesto | Novità | Feedback / successo |
|---|---|---|---|---|---|
| R1 | 2:05 | «Il mio telecomando. Meno chiacchiere.» | tap su ON | — (ripete B4) | la TV dietro Ettore, nella fascia alta, resta nera. «Niente. Come sempre.» |
| R2 | 2:10 | — | girare (asse verticale), scatto quando è a pancia in su | — | si vede la fessura del guscio |
| R3 | 2:18 | «La leva. Segui la fessura.» | tap sulla leva, poi **scorrere lungo la fessura** (corridoio di 45 px, il progresso non torna mai indietro) | **leva** | un «clic» per ogni gancetto al 25/50/75%, il guscio si apre con un «clac». Errore: uscire dal corridoio fa solo fermare il progresso |
| R4 | 2:32 | «Guarda dentro.» | lente sui due punti | lente **dentro** (*ten*) | due indizi: «filo scoperto» e «molla spostata». Il secondo vola più svelto |
| R5 | 2:45 | «Le pinzette. La molla a casa.» | tap sulle pinzette, poi **tenere premuto** sulla molla (le pinzette si chiudono), trascinare sulla sagoma fantasma della sede e lasciare | **pinzette** | scatto in sede con «ping» elastico. Se lasciata fuori, la molla torna morbida al suo posto. Mai due dita |
| R6 | 2:57 | «Nastro. Avvolgi il filo.» | tap sul nastro, poi **cerchio attorno al filo**, 720° | nastro (riusa il cerchio del cacciavite in un contesto nuovo) | il nastro si avvolge visibilmente ogni 120°, con un «sssk» |
| R7 | 3:07 | — | trascinare il guscio superiore su quello inferiore | — | «clac». Indizi spuntati |
| R8 | 3:12 | — | tap su ON | — | livello grande: la TV si accende su una partita, cori lontani. Ettore: «Ah. Il derby.» |

### 3.3 Chiusura (~3:15 → 3:25)
- Ettore si alza e si mette il cappello: «La base ce l'hai.» poi «Domani ti mando dalla signora del terzo piano.»
- Il taccuino si apre su una pagina nuova: «Sig.ra Pina · 3° piano», con la sagoma a punto interrogativo di una radio a valvole. È l'aggancio per tornare: curiosità, non un premio.
- La saracinesca scende fino a metà e sul cartello compare «Domani». Due bottoni: **Continua domani** e **Rigioca**. Nessun «Fine del tutorial».

### 3.4 Battute di correzione (*corr*, a rotazione, ≤ 8 parole)
- Attrezzo sbagliato: «Con quello? Mh. No.» / «Quello serve dopo, forse.» / «Bello, ma non c'entra.»
- Lente su un punto qualsiasi: nessuna battuta. Guardare è sempre lecito.
- Senza attrezzo dove ne serve uno: «A mani nude? Coraggioso.»
- Errore ripetuto per 3 volte di fila sullo stesso step: «Calma. Guarda cosa pulsa.» (e parte A2 subito).

---

## 4. Regole tecniche (nate dai bug della v1)

### 4.1 Gesti (un'unica tabella dei parametri, in `src/dati/gesti.js`)
| Gesto | Parametri |
|---|---|
| tap | ≤ 250 ms, spostamento ≤ 12 px, area ≥ 56 px (circa 9 mm) |
| girare | un asse solo, 0,6°/px, scatto entro 25° con molla di 250 ms, senza inerzia |
| lente | sfalsata di −70 px in y, raggio 55 px, si conferma dopo 0,4 s sopra il punto |
| cerchio | corona 24–180 px dal centro proiettato, scarto oltre 45° per frame, 540° per svitare, 360° per avvitare, 720° per il nastro |
| strofinare | area di raggio 90 px, 100% ≈ 1400 px di strada + bonus per inversione |
| trascinare pezzo | presa entro 60 px, oggetto 30 px sopra il dito, scatto entro 70 px |
| scorrere fessura | corridoio di 45 px, progresso = massimo raggiunto lungo la linea |
| pinzette | tieni premuto entro 60 px, trascina, lascia entro 60 px dalla sede |

Il dito che esce dall'area **mette in pausa** il gesto e non lo azzera. Tutto passa dai pointer events, con `touch-action: none` sul canvas.

### 4.2 Bersagli stabili
- Uno step accetta progresso **solo dopo `fermo`**. Un tocco iniziato durante una transizione viene messo in attesa e comincia a contare al `fermo`, così non si perde nulla.
- I centri dei gesti si ricalcolano **a ogni frame** dalla posizione proiettata del bersaglio, mai fissati all'inizio del gesto.
- Durante un gesto camera e oggetto non si muovono, a parte il feedback del gesto stesso.

### 4.3 Dialoghi
Le battute stanno in un grafo per id (come in v1, `testi.js`). **Validazione all'avvio:** ogni id usato in `contenuti.js` deve esistere, altrimenti errore in console e un segnaposto «…» visibile. Così un errore silenzioso non può più passare.

### 4.4 Salvataggio
Oltre a `{indice, linea}` si salva `progressoGesto` (0..1) dello step attivo, al massimo ogni 500 ms e su `visibilitychange`. Al ricarico la camera torna all'inquadratura dello step, il progresso viene ripristinato (anello, crosticina, vite) e Ettore dice «Dov'eravamo? Ah, sì.» (una volta sola).

### 4.5 Budget di prestazioni (telefono Android medio, per esempio Galaxy A3x o Moto G)
- `setPixelRatio(min(devicePixelRatio, 1.5))`. Se la media dei frame su 1 s supera 20 ms, si scende a 1,0. Se resta sotto 12 ms per 5 s, si risale. Il low poly a facce piatte regge bene un DPR basso.
- ≤ 40k triangoli e ≤ 50 draw call: le geometrie procedurali statiche si uniscono con `mergeGeometries`, si usa un materiale per colore.
- 1 luce emisferica + 1 direzionale. Una sola shadow map da 1024 oppure ombre «blob» finte. Nessun post-processing: bloom e fascio di luce sono sprite additivi.
- Render **su richiesta**: si disegna solo quando qualcosa si muove o c'è un gesto, per risparmiare batteria.
- Particelle da un pool (≤ 64 attive).
- Peso iniziale ≤ 1,5 MB compresso. La saracinesca HTML è visibile in ≤ 0,5 s e interattiva in ≤ 2 s su 4G.
- Obiettivo: ≥ 55 fps su quel telefono. Il dato headless non è rappresentativo, ma resta un allarme: anche lì, a DPR 1, si chiedono ≥ 20 fps.

---

## 5. Camera e layout (verticale)

### 5.1 Fasce dello schermo (dentro la safe area)
```
┌──────────────────────────┐  ← safe-area-inset-top
│ [◉Ettore]       nuvoletta │  FASCIA ALTA 0–22%: Ettore, nuvolette, TV (R1/R8)
│                      [⚙] │  ingranaggio 44 px in alto a destra, opaco al 40%
├──────────────────────────┤
│                          │  FASCIA LAVORO 22–76%
│     ┌──────────────┐     │  ZONA CALDA: 32–68% in verticale, 15–85% in orizzontale
│     │  bersaglio   │     │  → il bersaglio attivo sta SEMPRE qui
│     └──────────────┘     │  vassoietto (sx) e cassetto (dx) sul banco, nel mondo
├──────────────────────────┤
│ [📓] [🔍][🪛][🖌][…]      │  FASCIA BASSA 76–100%: cassetta (slot 64 px, ≥ 8 px di spazio)
└──────────────────────────┘  ← safe-area-inset-bottom (+16 px)
```
- La cassetta sta nella zona del pollice. Il taccuino è a sinistra della cassetta e appare solo in B6.
- Le impostazioni contengono «Salta tutorial» in fondo, «Riduci movimento», «Testo più grande», «Audio».
- In orizzontale compare una sagoma di telefono che si gira, senza testo, e il gioco va in pausa.
- Gli stati si riconoscono anche senza colore: attrezzo selezionato = sollevato + contorno, punto giusto = pulsazione + contorno.

### 5.2 Camera
- Prospettiva con FOV 35° (poca distorsione sul banco). **Inquadrature fisse per step**: BANCO, DETTAGLIO-CODA, DETTAGLIO-VITE, DETTAGLIO-TAPPO-APERTO, TC-RETRO, TC-INTERNO.
- Passaggi di 500–600 ms con ease-in-out sine. Lisciamento indipendente dal frame rate (`1 - exp(-k·dt)`), aggiornato dopo l'animazione degli oggetti. Nessuna orbita, nessuno screen shake.
- Regola di inquadratura: il centro del bersaglio attivo cade nella zona calda e occupa il 25–45% della larghezza.

---

## 6. «Juice» (livelli piccolo, medio, grande, tutto breve e con ritorno a riposo)

| Evento | V | S | H |
|---|---|---|---|
| prendere un attrezzo | sollevamento + pop di scala 1,15→1 (TRANS_BACK, 180 ms) | tick legnoso | 8 |
| quarto di giro della vite | la vite sale, l'anello si riempie | tic con tono che sale (±6%) | 6 |
| strofinata | 3–4 particelle verdi, la crosticina cambia fase | sh-sh legato alla velocità | 5 a inversione |
| indizio trovato | contorno, la scheda vola con un arco nel taccuino | campanellino | 15 |
| pezzo in sede | squash 1,2/0,8 → 1 (TRANS_BACK) | tump / clac | 12 |
| step riparato (piccolo) | 8 scintille, spunta disegnata nel taccuino | ding | 15 |
| oggetto riparato (grande) | luce o TV accesa, polvere dorata, timbro RIPARATO, scaldata di colore 1,5 s | arpeggio + nuovo strato musicale | 20-40-30 |
| errore | sussulto 0,95 (120 ms) | tonk sordo | — |

Audio in bus Musica / SFX / Voce (borbottio) / Ambiente, regolati in dB. Ogni SFX ripetuto ha 3 varianti con ±6% di tono a caso. La musica a strati entra al primo successo e cresce a ogni oggetto riparato. «Riduci movimento» toglie scintille e squash, e tiene suoni e contorni.

---

## 7. Metriche obiettivo

| Metrica | Obiettivo |
|---|---|
| Saracinesca visibile | ≤ 0,5 s |
| Primo input possibile | ≤ 2 s dall'apertura |
| Primo tocco utile (bottone torcia) | ≤ 12 s dall'apertura, mediana 9 s |
| Prima risposta del gioco a un tocco | ≤ 100 ms, sempre |
| Primo successo (indizio) | ≤ 40 s |
| Torcia completa | mediana ≤ 2:05, 90° percentile ≤ 3:00 |
| Tutorial completo | mediana ≤ 3:30, 90° percentile ≤ 5:00 |
| Parole per nuvoletta | ≤ 8 (limite 10). Totale delle parole di Ettore nel tutorial ≤ 160 |
| Nuvolette consecutive senza azione | ≤ 2 |
| Tempo senza input possibile | ≤ 2 s per transizione, ≤ 12 s in totale |
| Playtester che arrivano ad A3 sulla torcia | ≤ 20% per step |
| fps | ≥ 55 su un Android medio |
| Comprensione | ≥ 8 playtester su 10 descrivono il gioco come «capisco cos'ha un oggetto e lo aggiusto» |

---

## 8. Checklist anti-pattern (sì/no, la risposta giusta è sempre NO)

1. Prima del primo gesto c'è una schermata con solo testo o menu?
2. Qualche nuvoletta va toccata per andare avanti?
3. Qualche nuvoletta supera le 10 parole?
4. Ettore spiega un gesto prima che il giocatore abbia avuto 4 s per provarci da solo?
5. Il punto giusto pulsa prima che sia passata un'esitazione o ci sia stato un errore?
6. Uno step introduce più di un attrezzo o di un gesto nuovo?
7. A un attrezzo già presentato Ettore lo rispiega?
8. Una nuvoletta, il taccuino o un pulsante copre il bersaglio attivo o la cassetta?
9. Il bersaglio attivo esce dalla zona calda (32–68% in verticale)?
10. Un gesto perde progresso perché il dito è uscito, o perché l'oggetto o la camera si stavano muovendo?
11. C'è un errore che non produce suono e animazione entro 300 ms?
12. C'è un errore che rompe qualcosa, azzera il progresso o fa ricominciare?
13. Il ricarico durante un gesto fa perdere il progresso?
14. Serve usare due dita per qualcosa?
15. L'oggetto ruota liberamente su più di un asse?
16. La camera si muove durante un gesto, o c'è screen shake?
17. C'è testo d'interfaccia scritto («Trascina…», «Analizzare», «tocca per continuare»)?
18. «Salta tutorial» è visibile fuori dalle impostazioni?
19. Il finale mostra «Fine del tutorial» invece di restare nella finzione?
20. La stessa battuta di correzione esce due volte di fila?
21. Ci sono più di 2 s di fila senza input possibile, a parte B2?
22. Lo stato giusto o sbagliato si distingue solo dal colore?

---

## 9. Test di accettazione (sulla build reale)

Dispositivi: un Android medio (Chrome) e un iPhone (Safari), entrambi in verticale. Per il cronometro si registra lo schermo e si leggono i tempi dal video.

- **T1 · Primo tocco.** Profilo pulito, si apre il link su 4G. Passa se la saracinesca è visibile ≤ 0,5 s, l'input è possibile ≤ 2 s e il bottone della torcia è toccabile ≤ 12 s.
- **T2 · Comprensione a freddo.** 5 persone che non hanno mai visto il gioco, nessuna spiegazione. Dopo la torcia si chiede «cosa si fa in questo gioco?». Passa se almeno 4 dicono «capire cosa è rotto e aggiustarlo».
- **T3 · Scala degli aiuti.** In B7 si prende il cacciavite e si resta fermi. Si cronometra: pulsazione a 4 s (±0,3), mano fantasma a 6 s, battuta a 12 s. Nessun aiuto prima.
- **T4 · Errori gentili.** In B11 si usa la lente sulla vite, poi il pennellino, poi il senso sbagliato. Passa se ogni volta arriva una risposta entro 300 ms, le tre battute sono diverse e il progresso resta invariato.
- **T5 · Gesto durante una transizione.** Si comincia il cerchio sulla vite mentre la camera sta ancora arrivando a DETTAGLIO-VITE. Passa se il progresso parte al `fermo` e nulla va perso. Poi si gira con il dito che esce dalla corona per 1 s: il progresso resta.
- **T6 · Ricarico a metà.** Si svita fino a circa il 50%, si ricarica la pagina. Passa se l'anello è a circa il 50%, l'inquadratura è giusta e Ettore dice «Dov'eravamo?» una sola volta.
- **T7 · Zone sicure.** Su schermi 360×740, 390×844 e 430×932 con notch, si fa uno screenshot per ogni step. Passa se il bersaglio attivo è nella zona calda e nessuna nuvoletta interseca il bersaglio o la cassetta (si verifica con l'overlay di debug `?debug=zone`).
- **T8 · Integrità delle battute.** All'avvio la console non segnala id mancanti. Si forzano tutte le battute *corr* con `?debug=corr`: tutte visibili.
- **T9 · Prestazioni.** Su un Android medio, con Chrome remote debugging, si registra l'intero tutorial. Passa se la mediana è ≥ 55 fps, nessun frame supera 50 ms durante i gesti e il DPR effettivo è ≤ 1,5. In headless a DPR 1 servono ≥ 20 fps.
- **T10 · Senza audio e senza vibrazione.** Con iPhone in silenzioso si completa la torcia. Passa se ogni successo e ogni errore si capisce solo dal visivo.
- **T11 · Una mano.** Si gioca col solo pollice destro, telefono in una mano. Passa se tutti gli slot e i bersagli si raggiungono senza cambiare presa.
- **T12 · Durata.** Mediana su 5 playtester: torcia ≤ 2:05, tutto ≤ 3:30. Nessuno arriva ad A3 in più di 2 step.
- **T13 · Orizzontale.** Si ruota il telefono a metà gesto. Passa se il gioco va in pausa con la sagoma, e tornando in verticale riprende con lo stesso progresso.
- **T14 · Conteggio parole.** Uno script su `testi.js` verifica che nessuna battuta superi le 10 parole e che il totale del tutorial sia ≤ 160.

---

## Fonti
- Apple, Onboarding for Games: https://developer.apple.com/app-store/onboarding-for-games/
- Google Play Apps & Games, «Why the first ten minutes is crucial…»: https://medium.com/googleplaydev/why-the-first-ten-minutes-is-crucial-if-you-want-to-keep-players-coming-back-to-your-mobile-game-4a89031b6308
- Supersonic, 7 ways to optimize your FTUE: https://supersonic.com/learn/blog/optimizing-ftue/
- Portal, developer commentary: https://www.combineoverwiki.net/wiki/Developer_commentary/Portal
- Portal, post-mortem GDC 2008 (Swift, Wolpaw): https://cdn.fastly.steamstatic.com/apps/valve/2008/GDC2008_PortalPostMortem.pdf
- Hayashida e il kishōtenketsu: https://www.gamedeveloper.com/design/the-secret-to-i-mario-i-level-design
- Unpacking Zen (GDC): https://gdcvault.com/play/1029400/-Unpacking-Zen-Designing-a e https://www.gamedeveloper.com/design/unpacking-the-design-pillars-of-a-chill-puzzle-game
- A Little to the Left: https://littletotheleftgame.com/tips.html, https://www.gamedeveloper.com/design/the-methodical-catharsis-of-tidying-in-a-little-to-the-left, https://puzzlebyrinth.com/reviews/a-little-to-the-left
- Monument Valley: https://mechanicsofmagic.com/2025/05/09/a-monumental-valley-of-puzzles-too-much-of-a-stretch/, https://medium.com/game-design-fundamentals/critical-play-monument-valley-696efabf4e2e
- Assemble with Care: https://www.polygon.com/reviews/2019/10/1/20893203/assemble-with-care-us-two-games-impressions-apple-arcade/
- Florence: https://www.gamedeveloper.com/design/how-simple-mechanics-and-vignettes-inspired-i-florence-i-, https://gameinformer.com/gdc-2019/2019/03/20/florence-started-development-as-3d-rubiks-cube-of-human-heads
- Skill locali applicate: `gamedev/router`, `game-ui-ux` (ancore, safe area, target ≥ 9 mm, accessibilità), `game-feel` (livelli, easing, ritorno a riposo), `input-systems` (azioni, tolleranza, niente input simultanei), `camera-systems` (lisciamento indipendente dal frame rate, passaggi), `dialogue-systems` (battute per id, validazione dei nodi), `audio-design` (bus in dB, ducking, variazione SFX, musica a strati).
