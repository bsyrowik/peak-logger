/** @type {import("eslint").Linter.Config} */

const eslintPluginAstro = require('eslint-plugin-astro');
const tsParser = require('@typescript-eslint/parser');
const astroParser = require('astro-eslint-parser');

module.exports = [
	...eslintPluginAstro.configs['flat/recommended'],
	{
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				sourceType: 'module',
				ecmaVersion: 'latest'
			},
		},
		files: ['**/*.ts', '**/*.js', '**/*.mjs', '**/*.cjs'],
		ignores: ['**/cdk.out/**'],
	},
		{
				files: ['*.astro'],
				languageOptions: {
						parser: astroParser,
						parserOptions: {
								parser: tsParser,
								extraFileExtensions: ['.astro']
						},
						rules: {
								// override/add rules settings here, such as:
								// "astro/no-set-html-directive": "error"
						}
				}
		}
];
