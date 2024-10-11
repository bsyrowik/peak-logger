/** @type {import('tailwindcss').Config} */
const config = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
            colors: {
                'frog': {
                    '50': '#f6f9f4',
                    '100': '#e8f3e5',
                    '200': '#d2e6cc',
                    '300': '#99c68e',
                    '400': '#81b474',
                    '500': '#5e9750',
                    '600': '#497b3e',
                    '700': '#3c6134',
                    '800': '#334e2d',
                    '900': '#2a4126',
                    '950': '#132211',
                },
            },
        },
	},
	plugins: [],
};

module.exports = config;
