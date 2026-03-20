import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import FadeIn from "../components/FadeIn";
import blogPosts from "../data/blog-posts";

export default function BlogPost() {
  const { slug } = useParams();
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-botanique-charcoal mb-4">
            Post not found
          </h1>
          <Link to="/blog" className="text-botanique-green hover:underline">
            Back to blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20">
      <Helmet>
        <title>{`${post.title} | Botanique Designers`}</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={`https://www.botaniquedesigners.com/blog/${post.slug}`} />
      </Helmet>

      {/* Breadcrumb */}
      <div className="bg-botanique-beige py-3 px-4">
        <div className="max-w-4xl mx-auto text-sm text-gray-500">
          <Link to="/" className="hover:text-botanique-green">Home</Link> /{" "}
          <Link to="/blog" className="hover:text-botanique-green">Blog</Link> /{" "}
          <span className="text-botanique-green line-clamp-1">{post.title}</span>
        </div>
      </div>

      <FadeIn>
        <article className="py-12 md:py-16 px-4">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs bg-botanique-green/10 text-botanique-green px-2.5 py-0.5 rounded-full font-medium">
                  {post.category}
                </span>
                <span className="text-sm text-gray-400">
                  {new Date(post.date).toLocaleDateString("en-KE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-botanique-charcoal leading-tight">
                {post.title}
              </h1>
              <p className="text-gray-500 mt-4">{post.excerpt}</p>
            </div>

            {/* Content */}
            <div className="prose prose-gray max-w-none">
              {post.content.split("\n\n").map((para, i) => {
                if (para.startsWith("**") && para.endsWith("**")) {
                  return (
                    <h3
                      key={i}
                      className="text-xl font-bold text-botanique-charcoal mt-8 mb-3"
                    >
                      {para.replace(/\*\*/g, "")}
                    </h3>
                  );
                }
                if (para.startsWith("**")) {
                  const parts = para.split("**");
                  return (
                    <p key={i} className="text-gray-600 leading-relaxed mb-4">
                      {parts.map((part, j) =>
                        j % 2 === 1 ? (
                          <strong key={j} className="text-botanique-charcoal">
                            {part}
                          </strong>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  );
                }
                return (
                  <p key={i} className="text-gray-600 leading-relaxed mb-4">
                    {para}
                  </p>
                );
              })}
            </div>

            {/* Author */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Written by{" "}
                <span className="font-semibold text-botanique-charcoal">
                  Widson Ambaisi
                </span>{" "}
                — Founder & Principal Landscape Designer, Botanique Designers
              </p>
            </div>

            {/* Back */}
            <div className="mt-8">
              <Link
                to="/blog"
                className="text-botanique-green hover:underline text-sm font-medium"
              >
                ← Back to all posts
              </Link>
            </div>
          </div>
        </article>
      </FadeIn>
    </div>
  );
}
