import type { GalleryImage } from 'image-gallery-kit';

/*
 * The demo collection. Every `alt` describes the photograph the URL actually
 * returns, and every `width`/`height` is the size it actually serves -- the grid
 * packs columns from those numbers and the dialog derives each frame's ratio
 * from them, so a wrong pair here misshapes the layout rather than merely
 * misdescribing the picture.
 */
export const demoImages: GalleryImage[] = [
  {
    src: 'https://images.unsplash.com/photo-1511300636408-a63a89df3482?auto=format&fit=crop&w=1400&q=80',
    alt: 'A jagged coastal mountain at dusk, mirrored in the wet sand of a black beach',
    width: 1400,
    height: 933
  },
  {
    src: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1800&q=80',
    alt: 'Halved soft-boiled eggs and sliced avocado on seeded toast, on a dark slate board',
    width: 1800,
    height: 2552
  },
  {
    src: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80',
    alt: 'Chocolate chunk cookies cooling on parchment, one torn open to melting chocolate',
    width: 1200,
    height: 1501
  },
  {
    src: 'https://images.unsplash.com/photo-1464306076886-da185f6a9d05?auto=format&fit=crop&w=1200&q=80',
    alt: 'Plates of green salad with roasted mushrooms and a glass of orange juice on a tiled table',
    width: 1200,
    height: 800
  },
  {
    src: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=1500&q=80',
    alt: 'A brunch table from above: avocado toast with fried eggs, waffles with berries, coffee and orange juice',
    width: 1500,
    height: 1000
  },
  {
    src: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=1400&q=80',
    alt: 'A wicker basket heaped with baguettes, seeded rolls and crusty loaves beside wheat stalks',
    width: 1400,
    height: 788
  },
  {
    src: 'https://images.unsplash.com/photo-1519676867240-f03562e64548?auto=format&fit=crop&w=1200&q=80',
    alt: 'Folded crepes topped with ricotta, orange slices and candied peel, with a jar of honey',
    width: 1200,
    height: 1800
  },
  {
    src: 'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1300&q=80',
    alt: 'Two developers at a desk of monitors filled with code, a hillside through the window behind them',
    width: 1300,
    height: 867
  },
  {
    src: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
    alt: 'Three plates from above: crumbed fish, sliced rare steak with chilli, and beef with red onion',
    width: 1200,
    height: 800
  },
  {
    src: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
    alt: 'An empty restaurant dining room with leather booths, pale wood chairs and brass screens',
    width: 1600,
    height: 1067
  },
  {
    src: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1500&q=80',
    alt: 'A sliced cheese pizza on a wooden board with vine tomatoes and rosemary',
    width: 1500,
    height: 1000
  },
  {
    src: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&w=1600&q=80',
    alt: 'A bakery counter stacked with sourdough loaves and baguettes behind handwritten price cards',
    width: 1600,
    height: 1191
  },
  {
    src: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=1400&q=80',
    alt: 'Grilled langoustine tails on a wooden plate with dipping sauce, salad and sliced bread',
    width: 1400,
    height: 934
  },
  {
    src: 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=1500&q=80',
    alt: 'A close crop of ripe blueberries filling the frame',
    width: 1500,
    height: 1001
  },
  {
    src: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1400&q=80',
    alt: 'A salad bar from above: bowls of leaves and trays of beans, corn, peppers, cheese and ham',
    width: 1400,
    height: 933
  },
  {
    src: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=80',
    alt: 'A bowl of sliced avocado, watermelon radish, chickpeas and roast sweet potato with dressing',
    width: 1400,
    height: 933
  },
  {
    src: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1500&q=80',
    alt: 'A single plate of sweet potato noodles topped with a fried egg, on a painted blue surface',
    width: 1500,
    height: 1000
  },
  {
    src: 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?auto=format&fit=crop&w=1500&q=80',
    alt: 'A hand lifting noodles from a ramen bowl with pork, soft egg, corn and spring onion',
    width: 1500,
    height: 2250
  },
  {
    src: 'https://images.unsplash.com/photo-1514326640560-7d063ef2aed5?auto=format&fit=crop&w=1500&q=80',
    alt: 'A restaurant plate of seared fish with roasted vegetables, beetroot and a jug of dressing',
    width: 1500,
    height: 1500
  },
  {
    src: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1500&q=80',
    alt: 'A speckled bowl of courgette noodles, boiled eggs and greens on weathered wood, with blossom',
    width: 1500,
    height: 1021
  }
];
