import { WordPressPage } from '@/lib/wordpress';
import { demoteWpH1 } from '@/lib/wp-content';

interface WordPressPageProps {
  page: WordPressPage;
}

export default function WordPressPageComponent({ page }: WordPressPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <div className="content-container py-12 max-w-4xl">
        <h1
          className="text-4xl md:text-5xl font-bold mb-8 text-gray-900"
          dangerouslySetInnerHTML={{ __html: page.title.rendered }}
        />
        <div
          className="wp-page-content max-w-none"
          dangerouslySetInnerHTML={{ __html: demoteWpH1(page.content.rendered) }}
        />
      </div>
    </div>
  );
}
