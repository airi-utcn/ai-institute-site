"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";

function SearchRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  useEffect(() => {
    if (query) {
      router.replace(`/search/classic?q=${encodeURIComponent(query)}`);
    } else {
      router.replace("/search/classic");
    }
  }, [query, router]);

  return (
    <div className="page-container">
      <div className="content-wrapper content-padding text-center">
        <p className="text-gray-500">Redirecting to search...</p>
      </div>
    </div>
  );
}

export default function SearchIndex() {
  return (
    <Suspense fallback={<div className="page-container"><div className="content-wrapper content-padding text-center"><p className="text-gray-500">Loading...</p></div></div>}>
      <SearchRedirect />
    </Suspense>
  );
}
