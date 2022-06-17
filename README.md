
# Whatsapp-Poll-Bot

## DESCRIZIONE:
Bot per creare dei pool su whatsapp.
Funziona tramite la libreria whatsapp-web.js per un api non ufficiale basata su puppeteer,
e mongoDB per salvare tutti i sondaggi creati sui vari gruppi e per conteggiare i vari voti.

## INSTALLAZIONE: 

`npm i` 
per installare i pacchetti necessari.

`node index.js`
Starta il bot

Nella shell verrà stampato il qr da scannerizzare e inquadrare su whatsapp.

#### BOT OPERATIVO!

## FUNZIONI E COMANDI: 

 - `!poll` Tramite questo comando in chat di gruppo si può inizializzare
   un nuovo Sondaggio. 
   **ATTENZIONE: PUO' ESISTERE UN SOLO SONDAGGIO A GRUPPO**
   - Preceduta da **-d** è possibile impostare la domanda del sondaggio.
   - Precedute da **-r** è possibile impostare una o più risposte, divise da una virgola. 
   
     - Esempio: `!poll -d Domani andiamo in pizzeria? -r Sì,No` 
   Verrà posta la domanda: Domani andiamo in pizzeria?
   Con due possibilità di risposta: 0:Sì e 1:No.
   
- `!vote` Questo comando consente a i membri del gruppo di votare.
  - Scrivendo `!vote` + **la risposta o il numero indice della risposta**.
    Verrà processato e conteggiato il voto. E' attivo in default il cambio voto,
     difatti quindi anche dopo aver votato si può ancora cambiare il voto.

    - Esempio riprendendo quello precedente:
`!vote Sì oppure !vote 0` In entrambi i casi verrà registrato il voto "Sì"

- `!riepilogo` Se un sondaggio è già avviato invierà una lista dettagliata
taggando **TUTTI** i membri del gruppo e inserendoli in una lista dove hanno votato o non votato.
- `!ridomanda` rinvia il testo del sondaggio iniziale.

- `!endpoll` Chiude il sondaggio inviando un messaggio di riepilogo semplice. 
Ovviamente non sarà più possibile votare e verrà eliminato il sondaggio dal DB


   
