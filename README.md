# optaIV-scrap

---
### Comandos disponibles
```bash
npm run dev
```
---

### Contexto

<strong>SteamDB</strong> es una web que cuenta con una base de datos con los juegos existentes en [Steam](https://store.steampowered.com/), teniendo datos como el precio, descripcion,
jugadores concurrentes, el maximo historico de un juego, y entre otros datos mas.
<br>
<br>
<strong>HowLongToBeat</strong> es una web que cuenta con estadisticas de los juegos, tales como el tiempo promedio que toma un jugador en completar el juego,
el tiempo mas rapido en completarlo como al igual el mas lento.

---

### Dataset

El proyecto consta de dos datasets generados a traves de web scraping, siendo como dato de entrada la informacion obtenida a traves de [SteamDB](https://steamdb.info/) , 
para luego ser tomado como dataset de entrada y generar una busqueda de cada fila en [HowLongToBeat](https://howlongtobeat.com/) y traer la informacion correspondiente a su duracion estimada en completar un juego.

### Proposito
Teniendo en cuenta el contexto y los datasets generados, es esperado que con la infomracion obtenida sea capaz de generar un analisis apartir de los datos obtenidos,
logrando asi tener posibilades de analisis de si un juego es mas popular que otro en base al precio, o incluso el tiempo que le tomaria en completarlo afectaria el tiempo medio
que estaria un jugador en el juego.


