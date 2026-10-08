import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

const directory = path.dirname(fileURLToPath(import.meta.url));
function landingMetadata(): Plugin {
  return {
    name: 'landing-page-metadata',
    transformIndexHtml(html) {
      const items: { question: string; answer: string }[] = JSON.parse(readFileSync(path.join(directory, 'src/faq-items.json'), 'utf8'));
      const schema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) };
      return html.replace('<!-- FAQ_SCHEMA -->', `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`);
    },
    closeBundle() {
      const html = readFileSync(path.join(directory, 'dist/index.html'), 'utf8');
      for (const page of [
        { slug: 'roof-pergolas', title: 'برجولات روف وأسطح | تصميم وتنفيذ حسب المقاس | الأمين للبرجولات', description: 'تصميم وتنفيذ برجولات روف وأسطح بخشب معالج وخيارات تشطيب تناسب مساحتك. شاهد أعمالنا واطلب عرض سعر ومعاينة من الأمين للبرجولات.', image: 'input_file_1.webp' },
        { slug: 'garden-pergolas', title: 'برجولات حدائق وفلل | تصميم وتنفيذ حسب المقاس | الأمين للبرجولات', description: 'برجولات خشبية للحدائق والفلل بتصميم مناسب للمساحة والاستخدام. شاهد نماذج الأعمال واطلب عرض سعر ومعاينة من الأمين للبرجولات.', image: 'input_file_0.webp' }
      ]) {
        let content = html.replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`)
          .replace(/(<meta name="description" content=")[^"]*/, `$1${page.description}`)
          .replace(/(<meta property="og:title" content=")[^"]*/, `$1${page.title}`)
          .replace(/(<meta property="og:description" content=")[^"]*/, `$1${page.description}`)
          .replace(/(<meta name="twitter:title" content=")[^"]*/, `$1${page.title}`)
          .replace(/(<meta name="twitter:description" content=")[^"]*/, `$1${page.description}`)
          .replace(/(<link rel="canonical" href=")[^"]*/, `$1https://www.alaminpergolas.com/${page.slug}`)
          .replace(/(<meta property="og:url" content=")[^"]*/, `$1https://www.alaminpergolas.com/${page.slug}`)
          .replace(/(<meta (?:property="og:image"|name="twitter:image") content=")[^"]*/g, `$1https://www.alaminpergolas.com/${page.image}`)
          .replace(/(<link rel="preload" as="image" href=")[^"]*/, `$1/${page.image}`);
        writeFileSync(path.join(directory, `dist/${page.slug}.html`), content);
      }
    }
  };
}
export default defineConfig({
  plugins: [react(), tailwindcss(), landingMetadata()],
  base: '/',
  resolve: { alias: { '@': directory } },
  server: { hmr: process.env.DISABLE_HMR !== 'true' }
});
