export interface Category {
  id: string;
  label: string;
  slug: string;
  hasChildren: boolean;
  children?: Category[];
  isGroupLabel?: boolean;
}

export interface MenuState {
  isOpen: boolean;
  currentLevel: 1 | 2 | 3;
  navigationStack: NavigationItem[];
  selectedCategory: Category | null;
  selectedSubCategory: Category | null;
}

export interface NavigationItem {
  level: 1 | 2 | 3;
  data: Category | null;
}

export const categoriesData: Category[] = [
  {
    id: '16',
    label: 'Vinylboden',
    slug: 'vinylboden',
    hasChildren: true,
    children: [
      { id: '24', label: 'Klebe-Vinyl', slug: 'klebe-vinyl', hasChildren: false },
      { id: '17', label: 'Klick-Vinyl', slug: 'rigid-vinyl', hasChildren: false },
      { id: 'marken-vinyl', label: 'Marken', slug: '', hasChildren: false, isGroupLabel: true },
      { id: '127', label: 'COREtec', slug: 'coretec', hasChildren: false },
      { id: '125', label: 'primeCORE', slug: 'primecore', hasChildren: false },
    ],
  },
  {
    id: '25',
    label: 'Laminat',
    slug: 'laminat',
    hasChildren: true,
    children: [
      { id: 'marken-laminat', label: 'Marken', slug: '', hasChildren: false, isGroupLabel: true },
      { id: '126', label: 'O.R.C.A.', slug: 'o-r-c-a', hasChildren: false },
    ],
  },
  {
    id: '29',
    label: 'Parkett',
    slug: 'parkett',
    hasChildren: false,
  },
  {
    id: '43',
    label: 'Sockelleisten',
    slug: 'sockelleisten',
    hasChildren: false,
  },
  {
    id: '38',
    label: 'Dämmung',
    slug: 'daemmung',
    hasChildren: false,
  },
  {
    id: '40',
    label: 'Zubehör',
    slug: 'zubehoer',
    hasChildren: true,
    children: [
      { id: '41', label: 'Untergrundvorbereitung', slug: 'untergrundvorbereitung', hasChildren: false },
      { id: '64', label: 'Werkzeug', slug: 'werkzeug', hasChildren: false },
      { id: '61', label: 'Kleber', slug: 'kleber', hasChildren: false },
      { id: '58', label: 'Montagekleber & Silikon', slug: 'montagekleber-silikon', hasChildren: false },
      { id: '72', label: 'Reinigung & Pflege', slug: 'reinigung-pflege', hasChildren: false },
      { id: '53', label: 'Zubehör für Sockelleisten', slug: 'zubehoer-fuer-sockelleisten', hasChildren: false },
    ],
  },
];
