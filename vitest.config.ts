/// <reference types="vitest" />
import { getViteConfig, type ViteUserConfig } from 'astro/config';
import { configDefaults } from 'vitest/config';
import { loadEnv } from 'vite';

export default getViteConfig({
    test: {
        // Vitest configuration options
        env: loadEnv('', process.cwd(), ''),
        exclude: ['cdk/**', ...configDefaults.exclude],
        coverage: {
            exclude: [
                'cdk/**',
                '**/__mocks__/**',
                '**/astro:scripts**',
                '**/*.config.?(m|c)js',
                '**/dev.ts',
                ...configDefaults.coverage.exclude!,
            ],
        },
    },
} as unknown as ViteUserConfig);
