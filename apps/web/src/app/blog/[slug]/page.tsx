import { notFound } from 'next/navigation';
import Link from 'next/link';
import { posts, getPost } from '@/content/blog/posts';

export const dynamic = 'force-static';
export const revalidate = false;

export async function generateStaticParams() {
  return posts.map(p => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} — eWork Social Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <div style={{ minHeight: '100vh', background: '#080C14', fontFamily: "'Inter', sans-serif" }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1A2840', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, background: '#080C14', zIndex: 10 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/icon.png" alt="eWork Social" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 18, color: '#fff' }}>eWork Social</span>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/blog" style={{ color: '#6B8299', fontSize: 14, textDecoration: 'none' }}>← All articles</Link>
          <Link href="/register" style={{ background: '#2563EB', color: 'white', padding: '10px 20px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
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
          dangerouslySetInnerHTML={{ __html: post!.content }}
        />

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
