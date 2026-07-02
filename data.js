const IMG = {
  heroCar:   "https://images.unsplash.com/photo-1528597469186-bddab681a37f?w=1800&q=85&auto=format&fit=crop",
  carsThumb: "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=600&q=80&auto=format&fit=crop",
  carsNight: "https://images.unsplash.com/photo-1542362567-b07e54358753?w=900&q=80&auto=format&fit=crop",
  carsBMW:   "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&q=80&auto=format&fit=crop",
  natureThumb: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80&auto=format&fit=crop",
  natureForest: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&q=80&auto=format&fit=crop",
  spaceThumb: "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=600&q=80&auto=format&fit=crop",
  spacePlanet: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=900&q=80&auto=format&fit=crop",
  gamingThumb: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&q=80&auto=format&fit=crop",
  gamingCity: "https://images.unsplash.com/photo-1542931287-023b922fa89b?w=900&q=80&auto=format&fit=crop",
  abstractThumb: "https://images.unsplash.com/photo-1604871000636-074fa5117945?w=600&q=80&auto=format&fit=crop",
  abstractSwirl: "https://images.unsplash.com/photo-1558470598-a5dda9640f68?w=900&q=80&auto=format&fit=crop",
  amoledThumb: "https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=600&q=80&auto=format&fit=crop",
  torii: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=900&q=80&auto=format&fit=crop",
  about: "https://images.unsplash.com/photo-1419833479618-c595710e4f0e?w=900&q=80&auto=format&fit=crop"
};

const CATEGORIES = [
  { id:"cars", name:"Cars", icon:"🚗", img: IMG.carsThumb },
  { id:"nature", name:"Nature", icon:"⛰️", img: IMG.natureThumb },
  { id:"space", name:"Space", icon:"🪐", img: IMG.spaceThumb },
  { id:"gaming", name:"Gaming", icon:"🎮", img: IMG.gamingThumb },
  { id:"abstract", name:"Abstract", icon:"🔶", img: IMG.abstractThumb },
  { id:"amoled", name:"AMOLED", icon:"🌑", img: IMG.amoledThumb }
];

const WALLPAPERS = [
  { id:1, title:"Mountain Reflection", category:"nature", device:"Desktop", img:IMG.natureThumb, badge:"4K" },
  { id:2, title:"Night Drive", category:"cars", device:"Desktop", img:IMG.carsNight, badge:"4K" },
  { id:3, title:"Japanese Sunset", category:"nature", device:"Mobile", img:IMG.torii, badge:"4K" },
  { id:4, title:"Cyber City", category:"gaming", device:"Mobile", img:IMG.gamingCity, badge:"4K" },
  { id:5, title:"Cosmic Planet", category:"space", device:"Desktop", img:IMG.spacePlanet, badge:"4K" },
  { id:6, title:"BMW M4 Night", category:"cars", device:"Mobile", img:IMG.carsBMW, badge:"4K" },
  { id:7, title:"Alpine Mist", category:"nature", device:"Desktop", img:IMG.natureForest, badge:"4K" },
  { id:8, title:"Deep Field", category:"space", device:"Mobile", img:IMG.spaceThumb, badge:"4K" },
  { id:9, title:"Neon Rig", category:"gaming", device:"Desktop", img:IMG.gamingThumb, badge:"4K" },
  { id:10, title:"Liquid Flow", category:"abstract", device:"Desktop", img:IMG.abstractSwirl, badge:"4K" },
  { id:11, title:"Color Burst", category:"abstract", device:"Mobile", img:IMG.abstractThumb, badge:"4K" },
  { id:12, title:"Pure Black", category:"amoled", device:"Mobile", img:IMG.amoledThumb, badge:"AMOLED" },
  { id:13, title:"Eclipse", category:"amoled", device:"Mobile", img:IMG.amoledThumb, badge:"AMOLED" },
  { id:14, title:"Track Beast", category:"cars", device:"Desktop", img:IMG.heroCar, badge:"4K" }
];
