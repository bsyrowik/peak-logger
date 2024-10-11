// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
import astroAws from '@astro-aws/adapter';

import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  output: 'server',

  security: {
      checkOrigin: false
  },

  image: {
      service: passthroughImageService(),
  },

  adapter: astroAws({
      mode:'ssr',
  }),

  integrations: [tailwind()],
});