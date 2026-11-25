import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublishedPosts, getPost } from '@/content/blog/posts';

export const dynamic = 'force-static';
export const revalidate = 3600;

export async function generateStaticParams() {
  return getPublishedPosts().map(p => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.seoTitle ? `${post.seoTitle} | eWork Social` : `${post.title} — eWork Social Blog`,
    description: post.excerpt,
    alternates: { canonical: `https://www.eworksocial.com/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      url: `https://www.eworksocial.com/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authors: [post.author],
      images: [{ url: post.coverImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const url = `https://www.eworksocial.com/blog/${post!.slug}`;
  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post!.title,
      description: post!.excerpt,
      image: post!.coverImage,
      datePublished: post!.publishedAt,
      dateModified: post!.updatedAt ?? post!.publishedAt,
      author: { '@type': 'Person', name: post!.author },
      publisher: { '@type': 'Organization', name: 'eWork Social', logo: { '@type': 'ImageObject', url: 'https://www.eworksocial.com/icon.png' } },
      mainEntityOfPage: url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.eworksocial.com' },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.eworksocial.com/blog' },
        { '@type': 'ListItem', position: 3, name: post!.title, item: url },
      ],
    },
  ];
  if (post!.faq && post!.faq.length > 0) {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post!.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  const published = getPublishedPosts();
  const publishedSlugs = new Set(published.map(p => p.slug));
  // Links to posts that are not live yet are shown as plain text until their publish date.
  const bodyHtml = post!.content.replace(
    /<a\s+[^>]*href="(?:https?:\/\/[a-z.]*eworksocial\.com)?\/blog\/([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    (whole: string, slug: string, text: string) => (publishedSlugs.has(slug) ? whole : text),
  );
  let related = (post!.related ?? []).map(s => getPost(s)).filter((p): p is NonNullable<typeof p> => !!p);
  if (related.length < 3) {
    const have = new Set(related.map(r => r.slug));
    const others = published
      .filter(p => p.slug !== post!.slug && !have.has(p.slug))
      .sort((a, b) => (a.category === post!.category ? -1 : 0) - (b.category === post!.category ? -1 : 0) || b.publishedAt.localeCompare(a.publishedAt));
    related = [...related, ...others].slice(0, Math.max(3, related.length));
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Inter', sans-serif" }}>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      {/* Nav */}
      <nav className="blog-nav" style={{ borderBottom: '1px solid #1A2840', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, background: '#080C14', zIndex: 10 }}>
        <style>{`@media (max-width: 520px) { .blog-nav { padding: 0 16px !important; } .blog-nav-all { display: none !important; } }`}</style>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/icon.png" alt="eWork Social" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 18, color: '#fff', whiteSpace: 'nowrap' }}>eWork Social</span>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/blog" className="blog-nav-all" style={{ color: '#6B8299', fontSize: 14, textDecoration: 'none' }}>← All articles</Link>
          <Link href="/register" style={{ background: '#2563EB', color: 'white', padding: '10px 20px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
            Start Free Trial
          </Link>
        </div>
      </nav>

      {/* Article header */}
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '64px 24px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ background: '#1E3A5F', color: '#60A5FA', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 999 }}>
            {post!.category}
          </span>
          <span style={{ color: '#3A506B', fontSize: 13 }}>
            {new Date(post!.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <span style={{ color: '#3A506B', fontSize: 13 }}>· {post!.readTime} min read</span>
        </div>

        <h1 style={{ color: '#F0F6FF', fontSize: 38, fontWeight: 800, lineHeight: 1.2, margin: '0 0 24px', fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}>
          {post!.title}
        </h1>

        <p style={{ color: '#6B8299', fontSize: 18, lineHeight: 1.7, margin: '0 0 32px' }}>
          {post!.excerpt}
        </p>

        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 32, borderBottom: '1px solid #1A2840' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 700 }}>
            {post!.author.charAt(0)}
          </div>
          <div>
            <p style={{ color: '#F0F6FF', fontSize: 14, fontWeight: 600, margin: 0 }}>{post!.author}</p>
            <p style={{ color: '#3A506B', fontSize: 13, margin: 0 }}>Founder, eWork Social · Digital Marketing Manager</p>
          </div>
        </div>
      </div>

      {/* Article body */}
      <div style={{ maxWidth: 740, margin: '0 auto', padding: '0 24px 80px' }}>
        <style>{`
          .blog-content { color: #CBD5E1; font-size: 17px; line-height: 1.85; }
          .blog-content h2 { color: #F0F6FF; font-size: 26px; font-weight: 700; font-family: Georgia, serif; margin: 48px 0 16px; letter-spacing: -0.3px; }
          .blog-content h3 { color: #F0F6FF; font-size: 20px; font-weight: 600; margin: 36px 0 12px; }
          .blog-content p { margin: 0 0 24px; }
          .blog-content ul { margin: 0 0 24px; padding-left: 24px; }
          .blog-content li { margin-bottom: 10px; color: #94A3B8; }
          .blog-content strong { color: #F0F6FF; font-weight: 600; }
          .blog-content em { color: #94A3B8; font-style: italic; }
          .blog-content a { color: #60A5FA; text-decoration: underline; }
          .blog-content a:hover { color: #93C5FD; }
        `}</style>
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

        {post!.faq && post!.faq.length > 0 && (
          <section className="blog-content" style={{ marginTop: 56 }}>
            <h2>Frequently asked questions</h2>
            {post!.faq.map(f => (
              <div key={f.q}>
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </section>
        )}

        {related.length > 0 && (
          <section style={{ marginTop: 56 }}>
            <h2 style={{ color: '#F0F6FF', fontSize: 22, fontFamily: 'Georgia, serif', margin: '0 0 16px' }}>Keep reading</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              {related.map(r => (
                <Link key={r.slug} href={`/blog/${r.slug}`} style={{ display: 'block', padding: '16px 18px', background: '#0C1524', border: '1px solid #1A2840', borderRadius: 12, textDecoration: 'none' }}>
                  <span style={{ color: '#60A5FA', fontSize: 12, fontWeight: 600 }}>{r.category}</span>
                  <p style={{ color: '#F0F6FF', fontSize: 16, fontWeight: 600, margin: '4px 0 0' }}>{r.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div style={{ marginTop: 64, padding: '40px', background: '#0C1524', border: '1px solid #1A2840', borderRadius: 20, textAlign: 'center' }}>
          <p style={{ color: '#6B8299', fontSize: 14, margin: '0 0 8px' }}>Ready to try it yourself?</p>
          <h3 style={{ color: '#F0F6FF', fontSize: 22, fontWeight: 700, margin: '0 0 20px', fontFamily: 'Georgia, serif' }}>
            Manage all your clients from one dashboard — free for 7 days.
          </h3>
          <Link href="/register" style={{ display: 'inline-block', background: '#2563EB', color: 'white', padding: '14px 32px', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
            Start Free Trial — No Card Required →
          </Link>
          <p style={{ color: '#3A506B', fontSize: 12, marginTop: 12 }}>
            Founding member spots still open · 50% off locked in permanently
          </p>
        </div>

        {/* Back link */}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <Link href="/blog" style={{ color: '#4A6080', fontSize: 14, textDecoration: 'none' }}>
            ← Back to all articles
          </Link>
        </div>
      </div>
    </div>
  );
}
