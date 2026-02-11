# 🏠 House Finder - Toulouse

App de revue de maisons pour la recherche immobilière près de Toulouse.

## Critères de recherche

| Critère | Valeur |
|---------|--------|
| **Localisation** | ≤40 min de 10 Imp. André Marestan, 31100 Toulouse |
| **Prix max** | 450 000 € |
| **Chambres** | ≥5 |
| **Séjour** | ≥40 m² |
| **Garage** | ≥40 m² |
| **Terrain** | ≥1 000 m² |
| **Travaux** | <10 000 € |
| **État** | Pas à construire |

### Bonus appréciés
- 🏊 Piscine
- 👀 Vue dégagée
- 🌳 Terrain arboré
- ☀️ Orientation sud
- 🔒 Pas de vis-à-vis

## Installation

```bash
pnpm install
pnpm dev
```

Ouvre http://localhost:3000

## Utilisation

### Ajouter des maisons

Édite le fichier `data/houses.json` et ajoute des objets dans le tableau `houses` :

```json
{
  "id": "unique-id",
  "url": "https://www.leboncoin.fr/...",
  "title": "Maison 5 chambres...",
  "price": 420000,
  "location": "Ville (31XXX)",
  "distanceMinutes": 25,
  "bedrooms": 5,
  "livingAreaM2": 45,
  "garageM2": 42,
  "landM2": 1200,
  "hasPool": true,
  "hasView": false,
  "isTreed": true,
  "southFacing": true,
  "noVisAVis": true,
  "estimatedWorkCost": 5000,
  "source": "leboncoin",
  "images": ["url1", "url2"],
  "description": "Description...",
  "addedAt": "2026-02-11T07:00:00Z",
  "status": "pending",
  "notes": ""
}
```

### Passer en revue

1. Ouvre l'app
2. Clique **OK** ou **KO** sur chaque maison
3. Ajoute des notes si besoin
4. Clique **Sauvegarder** pour écraser le JSON

### Filtres

- **Tout** : toutes les maisons
- **À voir** : status `pending`
- **OK** : maisons validées
- **KO** : maisons refusées

## Structure des données

```typescript
interface House {
  id: string;
  url: string;
  title: string;
  price: number;
  location: string;
  distanceMinutes?: number;
  bedrooms: number;
  livingAreaM2?: number;
  garageM2?: number;
  landM2?: number;
  hasPool?: boolean;
  hasView?: boolean;
  isTreed?: boolean;
  southFacing?: boolean;
  noVisAVis?: boolean;
  estimatedWorkCost?: number;
  source: 'leboncoin' | 'seloger' | 'pap' | 'bienici' | 'ouestfrance' | 'other';
  images: string[];
  description?: string;
  addedAt: string;
  status: 'pending' | 'ok' | 'ko';
  notes?: string;
}
```

## Sites de recherche

- [Le Bon Coin](https://www.leboncoin.fr/recherche?category=9&real_estate_type=1&locations=r_30_4&price=min-450000&rooms=5-max&land_plot_surface=1000-max)
- [SeLoger](https://www.seloger.com/immobilier/achat/immo-haute-garonne-31/bien-maison/)
- [PAP](https://www.pap.fr/annonce/vente-maisons-haute-garonne-31-g31)
- [Bien'ici](https://www.bienici.com/recherche/achat/haute-garonne-31/maison)
- [Logic-Immo](https://www.logic-immo.com/vente-immobilier-haute-garonne,31_99/options/groupprptypesalialialialialialialialialialialialialialialialialialialialialialialialialialialialia)

### Filtres recommandés
- Type : Maison
- Prix max : 450 000 €
- Pièces : 6+ (5 chambres + séjour)
- Terrain : ≥1 000 m²
- Zone : Haute-Garonne / 40km autour de Toulouse
