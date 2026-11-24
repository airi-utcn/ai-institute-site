"""Fast, network-free tests for the paper graph reliability helpers."""

import unittest

from research_paper_graph.graph import _paper_text, _same_work, cap_links_top_k
from research_paper_graph.sources import _dedupe_papers
from research_paper_graph.strapi import StrapiClient
from research_paper_graph.utils import normalize_doi, normalize_openalex_id, normalize_person_name, normalize_title


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


class ExclusionTests(unittest.TestCase):
    def setUp(self):
        self.client = StrapiClient("http://example.invalid", "token")
        self.client._graph_exclusions = [
            {
                "documentId": "id",
                "label": "by id",
                "openAlexId": normalize_openalex_id("https://openalex.org/W1"),
                "doi": "",
                "title": "",
                "scope": "graphOnly",
            },
            {
                "documentId": "doi",
                "label": "by doi",
                "openAlexId": "",
                "doi": normalize_doi("10.1/ABC"),
                "title": "",
                "scope": "hideEverywhere",
            },
            {
                "documentId": "title",
                "label": "by title",
                "openAlexId": "",
                "doi": "",
                "title": normalize_title("Table of Contents"),
                "scope": "hideEverywhere",
            },
        ]

    def test_matches_openalex_id(self):
        match = self.client.match_graph_exclusion(
            openalex_id="https://openalex.org/W1/"
        )
        self.assertEqual(match["documentId"], "id")

    def test_matches_doi(self):
        match = self.client.match_graph_exclusion(doi="https://doi.org/10.1/abc")
        self.assertEqual(match["documentId"], "doi")

    def test_matches_exact_normalized_title(self):
        match = self.client.match_graph_exclusion(title="Table  of Contents")
        self.assertEqual(match["documentId"], "title")

    def test_does_not_fuzzy_match_titles(self):
        self.assertIsNone(
            self.client.match_graph_exclusion(title="Table of Contents and Index")
        )

    def test_hide_everywhere_unpublishes_and_removes_from_graph(self):
        self.client._graph_exclusions = [self.client._graph_exclusions[2]]
        self.client._pub_records = {
            "doc1": {
                "openAlexId": "",
                "doi": "",
                "title": normalize_title("Table of Contents"),
            }
        }
        self.client._pub_graph_eligible = {"doc1": True}
        self.client._pub_published = {"doc1": True}
        calls = []
        unpublished = []

        def fake_update(document_id, payload):
            calls.append((document_id, payload))
            return True

        def fake_unpublish(document_id):
            unpublished.append(document_id)
            return True

        self.client.update_publication = fake_update
        self.client.unpublish_publication = fake_unpublish
        stats = self.client.apply_graph_exclusions()

        self.assertEqual(stats["matched"], 1)
        self.assertEqual(stats["unpublished"], 1)
        self.assertEqual(unpublished, ["doc1"])
        self.assertEqual(calls, [("doc1", {"graphEligible": False})])

    def test_graph_only_keeps_publication_visible(self):
        self.client._graph_exclusions = [self.client._graph_exclusions[0]]
        self.client._pub_records = {
            "doc1": {
                "openAlexId": normalize_openalex_id("https://openalex.org/W1"),
                "doi": "",
                "title": "",
            }
        }
        self.client._pub_graph_eligible = {"doc1": True}
        self.client._pub_published = {"doc1": True}
        calls = []

        def fake_update(document_id, payload):
            calls.append((document_id, payload))
            return True

        self.client.update_publication = fake_update
        stats = self.client.apply_graph_exclusions()

        self.assertEqual(stats["graph_updated"], 1)
        self.assertEqual(stats["unpublished"], 0)
        self.assertEqual(calls, [("doc1", {"graphEligible": False})])


class UploadExclusionTests(unittest.TestCase):
    def test_excluded_paper_is_not_created(self):
        from research_paper_graph.strapi_sync import upload_publications

        created = []

        class FakeStrapi:
            def load_existing_publications(self):
                pass

            def load_existing_people(self):
                pass

            def match_graph_exclusion(self, **kwargs):
                return {"scope": "hideEverywhere", "documentId": "exclusion"}

            def create_publication(self, *args, **kwargs):
                created.append(args)

        _pub_map, stats = upload_publications(
            FakeStrapi(),
            [{"title": "Table of contents", "openAlexId": "W1"}],
            skip_pdf=True,
        )

        self.assertEqual(stats["excluded"], 1)
        self.assertEqual(stats["created"], 0)
        self.assertEqual(created, [])


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
