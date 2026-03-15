# Music Server Volumio Plugin

Plugin `music_service` per Volumio che integra il browsing di un server remoto compatibile con l'API del progetto locale `musicserver`.

## Funzionalità implementate

- Aggiunta sorgente in Browse come **Music Server**
- Browsing remoto via `POST /browse`
- Mapping cartelle / brani nella UI Volumio
- Supporto `explodeUri` per tracce con stream da `GET /stream?id=...`
- Configurazione host / porta / protocollo da UI plugin

## Endpoint remoto atteso

Il server remoto deve esporre:

- `POST /browse` con body JSON `{ "path": "/" | "<remote-id>" }`
- `GET /stream?id=<remote-song-id>`

## Configurazione di default

- protocol: `http`
- host: `127.0.0.1`
- port: `3000`

Puoi modificare i valori dal pannello impostazioni del plugin in Volumio.

## Note installazione

Questo repository è pronto come sorgente plugin; in Volumio la struttura prevista è:

`music_service/musicserver/`

con i file mandatory (`index.js`, `package.json`, `config.json`, `install.sh`, `uninstall.sh`).
