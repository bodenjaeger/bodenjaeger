import { wordPressClient } from '@/lib/wordpress';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { stripHtml } from '@/lib/schema';

export const revalidate = 300; // 5 minutes

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await wordPressClient.getPostBySlug(slug);
  if (!post) {
    return { title: 'Beitrag nicht gefunden | Bodenjäger' };
  }

  const title = stripHtml(post.title.rendered);
  const excerpt = stripHtml(post.excerpt?.rendered || '').replace(/\s+/g, ' ').trim();
  const description = excerpt.length > 155 ? `${excerpt.slice(0, 154).trimEnd()}…` : excerpt;

  return buildMetadata({
    path: `/blog/${post.slug}`,
    title: `${title} | Bodenjäger`,
    description: description || `${title} – Ratgeber von Bodenjäger`,
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await wordPressClient.getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const featuredImage = post._embedded?.['wp:featuredmedia']?.[0];
  const author = post._embedded?.author?.[0];
  const postDate = new Date(post.date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white">
      <article className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Back to Blog Link */}
        <Link
          href="/blog"
          className="inline-flex items-center text-brand hover:text-[#d11820] mb-8 font-semibold"
        >
          <span className="mr-2">←</span>
          Zurück zum Blog
        </Link>

        {/* Featured Image */}
        {featuredImage && (
          <div className="relative w-full h-96 mb-8 rounded-lg overflow-hidden">
            <Image
              src={featuredImage.source_url}
              alt={featuredImage.alt_text || post.title.rendered}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Post Title */}
        <h1
          className="text-4xl md:text-5xl font-bold text-dark mb-6"
          dangerouslySetInnerHTML={{ __html: post.title.rendered }}
        />

        {/* Post Meta */}
        <div className="flex items-center gap-6 text-[#666666] mb-8 pb-8 border-b border-gray-200">
          <time dateTime={post.date} className="text-sm">
            {postDate}
          </time>
          {author && (
            <div className="flex items-center gap-2">
              <span className="text-sm">von</span>
              <span className="text-sm font-semibold text-dark">{author.name}</span>
            </div>
          )}
        </div>

        {/* Post Content */}
        <div
          className="prose prose-lg max-w-none
            prose-headings:text-dark
            prose-h2:text-3xl prose-h2:font-bold prose-h2:mt-12 prose-h2:mb-6
            prose-h3:text-2xl prose-h3:font-bold prose-h3:mt-8 prose-h3:mb-4
            prose-p:text-[#333333] prose-p:leading-relaxed prose-p:mb-6
            prose-a:text-brand prose-a:hover:text-[#d11820] prose-a:no-underline prose-a:hover:underline
            prose-strong:text-dark prose-strong:font-bold
            prose-ul:text-[#333333] prose-ul:my-6
            prose-ol:text-[#333333] prose-ol:my-6
            prose-li:mb-2
            prose-blockquote:border-l-4 prose-blockquote:border-brand prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-[#666666]
            prose-img:rounded-lg prose-img:shadow-lg prose-img:my-8"
          dangerouslySetInnerHTML={{ __html: post.content.rendered }}
        />

        {/* Author Info */}
        {author && (
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex items-start gap-4">
              {author.avatar_urls?.['96'] && (
                <Image
                  src={author.avatar_urls['96']}
                  alt={author.name}
                  width={64}
                  height={64}
                  className="rounded-full"
                />
              )}
              <div>
                <h3 className="text-xl font-bold text-dark mb-2">
                  Über {author.name}
                </h3>
                {author.description && (
                  <p className="text-[#666666]">{author.description}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Back to Blog */}
        <div className="mt-12 text-center">
          <Link
            href="/blog"
            className="inline-block bg-brand text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#d11820] transition-colors"
          >
            Weitere Beiträge lesen
          </Link>
        </div>
      </article>
    </div>
  );
}
