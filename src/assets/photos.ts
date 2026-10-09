// Zentrale Foto-Zuordnung für die Website.
// Die Originaldateien liegen in src/assets/image/ (1.png … 10.png).
// Vite löst die Importe zu fertigen URLs auf.

import terrasseSonnenschirme from "./image/1.png"
import terrasseFluss from "./image/2.png"
import tischFlussblick from "./image/3.png"
import schildTerrasse from "./image/4.png"
import schildWeg from "./image/5.png"
import schildHerbst from "./image/6.png"
import saalInnen from "./image/7.png"
import pfalzelFluss from "./image/8.png"
import kaffeeTulpe from "./image/9.png"
import terrasseWeissbier from "./image/10.png"

// Stilisierte Gericht-Illustrationen (passend zur Farbpalette der Seite)
import dishSchnitzel from "./dishes/schnitzel.svg"
import dishLachsfilet from "./dishes/lachsfilet.svg"
import dishCurrypfanne from "./dishes/currypfanne.svg"

// Echte Gericht-Fotos
import dishSchnitzelFoto from "./image/wienerart.png"
import dishLachsfiletFoto from "./image/lachs.png"
import dishCurrypfanneFoto from "./image/gemuse.png"

export const photos = {
  dishSchnitzel,
  dishLachsfilet,
  dishCurrypfanne,
  dishSchnitzelFoto,
  dishLachsfiletFoto,
  dishCurrypfanneFoto,
  terrasseSonnenschirme,
  terrasseFluss,
  tischFlussblick,
  schildTerrasse,
  schildWeg,
  schildHerbst,
  saalInnen,
  pfalzelFluss,
  kaffeeTulpe,
  terrasseWeissbier,
}

export type PhotoKey = keyof typeof photos
