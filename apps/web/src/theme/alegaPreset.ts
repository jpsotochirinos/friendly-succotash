import Aura from '@primevue/themes/aura';
import { definePreset, palette } from '@primevue/themes';

/**
 * Alega brand preset
 * - primary: Acento Zafiro (#2D3FBF) — CTAs, links, active states
 * - surface (light): Blanco Papel → Azul Medianoche
 * - surface (dark):  Hielo (texto) → Azul Abismo (fondo)
 */
const primary = palette('#2D3FBF');

const lightSurface = {
  0: '#ffffff',
  50: '#F2F3FB',
  100: '#e8eaf7',
  200: '#d7dbef',
  300: '#b8bddf',
  400: '#949bc9',
  500: '#6f77b0',
  600: '#575e98',
  700: '#454a78',
  800: '#2f335a',
  900: '#1B2080',
  950: '#141852',
};

const darkSurface = {
  0: '#ffffff',
  50: '#e8eafd',
  100: '#C8CCF5',
  200: '#a8addb',
  300: '#888fc1',
  400: '#6a71a8',
  500: '#4f5690',
  600: '#3d4478',
  700: '#2f3560',
  800: '#1B2080',
  900: '#141852',
  950: '#0D0F2B',
};

export const AlegaPreset = definePreset(Aura, {
  semantic: {
    primary,
    colorScheme: {
      light: {
        surface: lightSurface,
        primary: {
          color: '{primary.500}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.600}',
          activeColor: '{primary.700}',
        },
      },
      dark: {
        surface: darkSurface,
        primary: {
          color: '{primary.300}',
          contrastColor: '#0D0F2B',
          hoverColor: '{primary.200}',
          activeColor: '{primary.100}',
        },
        text: {
          color: '#F2F3FB',
          hoverColor: '#ffffff',
          mutedColor: '#C8CCF5',
          hoverMutedColor: '#e8eafd',
        },
      },
    },
  },
});
