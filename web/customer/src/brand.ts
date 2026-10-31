// Everything brand-specific lives here, so the Help Center can be re-skinned in one place.
// PawChamp assets are used with the partner's OK for the hackathon demo; swap them before any public release.

export const brand = {
  name: 'PawChamp',
  logo: '/brand/logo.svg',
  tagline: 'Help Center — support and FAQ in one place',
  heroImage: 'https://help.paw-champ.com/hc/theming_assets/01KT1QHP9DYX0R12B2JGRBB6EX',
  phoneMockup: 'https://images.paw-champ.com/pc/images/common/site/home/paralax/en/main.png',
  mascot: 'https://images.paw-champ.com/pc/images/common/site/home/dog-with-star-glasses.png',
  colors: {
    ink: '#16191e',
    muted: '#444547',
    coral: '#ff756b',
    red: '#ed2c29',
    pink: '#ffb1ac',
    blush: '#ffe0e0',
    blue: '#1998cd',
    line: '#d9d9d9',
  },
  assistant: 'Yurko',
}

export const cssVars: Record<string, string> = {
  '--ink': brand.colors.ink,
  '--muted': brand.colors.muted,
  '--coral': brand.colors.coral,
  '--red': brand.colors.red,
  '--pink': brand.colors.pink,
  '--blush': brand.colors.blush,
  '--blue': brand.colors.blue,
  '--line': brand.colors.line,
  '--grad': `linear-gradient(90deg,${brand.colors.coral},${brand.colors.red})`,
}
