"""Fast, network-free tests for the paper graph reliability helpers."""

import unittest

from research_paper_graph.graph import _paper_text, _same_work, cap_links_top_k
from research_paper_graph.sources import _dedupe_papers
from research_paper_graph.strapi import StrapiClient
from research_paper_graph.utils import normalize_person_name, normalize_title


class SameWorkTests(unittest.TestCase):
    def test_same_openalex_id(self):
        self.assertTrue(
            _same_work(
                {"openAlexId": "https://openalex.org/W1", "title": "A"},
                {"openAlexId": "https://openalex.org/W1/", "title": "B"},
            )
        )

    def test_same_doi(self):
        self.assertTrue(
            _same_work(
                {"doi": "https://doi.org/10.1/ABC"},
                {"doi": "10.1/abc"},
            )
        )

    def test_same_normalized_title(self):
        self.assertTrue(
            _same_work({"title": "Whale  Optimization"}, {"title": "whale optimization"})
        )

    def test_similar_but_distinct_is_not_duplicate(self):
        self.assertFalse(
            _same_work(
                {"title": "Forest Inspection Dataset - Overcast sequences"},
                {"title": "Forest Inspection Dataset - Sunny sequences"},
            )
        )


class EmbeddingTextTests(unittest.TestCase):
    def test_abstract_wins(self):
        self.assertEqual(
            _paper_text({"title": "T", "abstract": "A", "topics": ["X"]}),
            "T A",
        )

    def test_topics_fallback(self):
        self.assertEqual(
            _paper_text({"title": "T", "abstract": None, "topics": ["X", "Y"]}),
            "T X Y",
        )

    def test_no_abstract_no_topics(self):
        self.assertEqual(_paper_text({"title": "T"}), "T")


class TopKTEsts(unittest.TestCase):
    def test_keeps_top_links_per_node(self):
        links = [
            {"source_paper_id": "a", "target_paper_id": "b", "score": 0.9},
            {"source_paper_id": "a", "target_paper_id": "c", "score": 0.8},
            {"source_paper_id": "a", "target_paper_id": "d", "score": 0.7},
            {"source_paper_id": "b", "target_paper_id": "c", "score": 0.6},
        ]
        kept = cap_links_top_k(links, 2)
        pairs = {(link["source_paper_id"], link["target_paper_id"]) for link in kept}
        self.assertIn(("a", "b"), pairs)
        self.assertIn(("a", "c"), pairs)
        self.assertNotIn(("a", "d"), pairs)

    def test_zero_keeps_all(self):
        links = [{"source_paper_id": "a", "target_paper_id": "b", "score": 0.9}]
        self.assertEqual(cap_links_top_k(links, 0), links)


class AuthorMatchingTests(unittest.TestCase):
    def setUp(self):
        self.client = StrapiClient("http://example.invalid", "token")
        self.client._person_by_oaid = {
            "A123": {"documentId": "by-id", "fullName": "Anghel Ionut"},
        }
        self.client._person_by_name = {
            normalize_person_name("Anghel Ionuț"): {
                "documentId": "by-name",
                "fullName": "Anghel Ionuț",
            },
            normalize_person_name("Tudor Cioara"): {
                "documentId": "tudor",
                "fullName": "Tudor Cioara",
            },
        }

    def test_matches_by_openalex_author_id_first(self):
        matched = self.client.match_authors(
            ["Anghel Ionut"], ["https://openalex.org/A123"]
        )
        self.assertEqual(matched, ["by-id"])

    def test_matches_reordered_and_diacritic_names(self):
        matched = self.client.match_authors(["Ionut Anghel"])
        self.assertEqual(matched, ["by-name"])

    def test_does_not_match_unrelated_name(self):
        self.assertEqual(self.client.match_authors(["Someone Else"]), [])


class DedupeTests(unittest.TestCase):
    def test_merges_same_openalex_id(self):
        papers = _dedupe_papers(
            [
                {"openAlexId": "W1", "title": "A", "topics": ["x"]},
                {"openAlexId": "W1", "title": "A", "topics": ["y"]},
            ]
        )
        self.assertEqual(len(papers), 1)
        self.assertEqual(papers[0]["topics"], ["x", "y"])

    def test_drops_untitled_works(self):
        self.assertEqual(_dedupe_papers([{"openAlexId": "W1", "title": None}]), [])

    def test_normalizes_title(self):
        self.assertEqual(normalize_title("  A   B "), "a b")


if __name__ == "__main__":
    unittest.main()
