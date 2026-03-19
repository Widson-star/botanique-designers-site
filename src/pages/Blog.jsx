import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import FadeIn from "../components/FadeIn";
import blogPosts from "../data/blog-posts";

const categories = ["All", ...new Set(blogPosts.map((p) => p.category))];

export default function Blog() {
  const [filter, setFilter] = useState("All");

  const filtered =
    filter === "All" ? blogPosts : blogPosts.filter((p) => p.category === filter);

  return (
    <>
      <Helmet>
        <title>Blog | Botanique Designers</title>
        <link rel="canonical" href="https://www.botaniquedesigners.com/blog" />
      </Helmet>
      <div className="pt-20">
      {/* Hero */}
      <section className="relative h-[35vh] min-h-[260px] flex items-center justify-center bg-botanique-dark">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: "url('/projects/project-7.jpg')" }}
        />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Blog
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Plant science, project updates, and industry notes.
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="bg-botanique-beige py-3 px-4">
        <div className="max-w-6xl mx-auto text-sm text-gray-500">
          <Link to="/" className="hover:text-botanique-green">Home</Link> /{" "}
          <span className="text-botanique-green">Blog</span>
        </div>
      </div>

      {/* Filter */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition cursor-pointer ${
                filter === cat
                  ? "bg-botanique-green text-white"
                  : "bg-botanique-beige text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Posts */}
      <section className="pb-16 md:pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((post) => (
              <FadeIn key={post.slug}>
                <Link
                  to={`/blog/${post.slug}`}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-gray-100 flex flex-col"
                >
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs bg-botanique-green/10 text-botanique-green px-2.5 py-0.5 rounded-full font-medium">
                        {post.category}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(post.date).toLocaleDateString("en-KE", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-botanique-charcoal group-hover:text-botanique-green transition-colors mb-3">
                      {post.title}
                    </h2>
                    <p className="text-sm text-gray-500 flex-1">
                      {post.excerpt}
                    </p>
                    <span className="text-sm text-botanique-green font-medium mt-4 inline-block">
                      Read more →
                    </span>
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-12">
              No posts in this category yet.
            </p>
          )}
        </div>
      </section>
    </div>
    </>
  );
}
