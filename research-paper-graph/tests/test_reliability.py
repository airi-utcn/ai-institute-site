"""Fast, network-free tests for the paper graph reliability helpers."""

import unittest

from research_paper_graph.graph import _paper_text, _same_work, cap_links_top_k, label_topic_clusters
from research_paper_graph.import_scope import is_importable_work, out_of_scope_reason
from research_paper_graph.sources import _dedupe_papers
from research_paper_graph.strapi_sync import _macro_scores, replace_graph_links, upload_publications
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
        events = []

        def fake_update(document_id, payload):
            events.append("update")
            calls.append((document_id, payload))
            return True

        def fake_unpublish(document_id):
            events.append("unpublish")
            unpublished.append(document_id)
            return True

        self.client.update_publication = fake_update
        self.client.unpublish_publication = fake_unpublish
        stats = self.client.apply_graph_exclusions()

        self.assertEqual(stats["matched"], 1)
        self.assertEqual(stats["unpublished"], 1)
        self.assertEqual(unpublished, ["doc1"])
        self.assertEqual(calls, [("doc1", {"graphEligible": False})])
        self.assertEqual(events, ["update", "unpublish"])

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


class ImportScopeTests(unittest.TestCase):
    def test_book_chapter_without_abstract_is_rejected(self):
        paper = {"title": "Love and Marriage", "kind": "book-chapter", "abstract": ""}
        self.assertFalse(is_importable_work(paper))
        self.assertIn("without abstract", out_of_scope_reason(paper))

    def test_puzzle_book_chapter_is_rejected_even_with_textual_topics(self):
        paper = {
            "title": "Island of Truth",
            "kind": "book-chapter",
            "abstract": "",
            "topics": ["Logic, Reasoning, and Knowledge"],
        }
        self.assertFalse(is_importable_work(paper))

    def test_book_chapter_with_abstract_is_allowed(self):
        paper = {
            "title": "Multi-agent Reinforcement Learning: An Overview",
            "kind": "book-chapter",
            "abstract": "A survey of multi-agent reinforcement learning.",
        }
        self.assertTrue(is_importable_work(paper))

    def test_article_without_abstract_is_allowed(self):
        paper = {"title": "A useful paper", "kind": "article", "abstract": ""}
        self.assertTrue(is_importable_work(paper))

    def test_front_matter_title_is_rejected(self):
        self.assertFalse(is_importable_work({"title": "Contents", "kind": None}))
        self.assertFalse(is_importable_work({"title": "Table of Contents", "kind": "book"}))

    def test_unknown_type_is_rejected(self):
        paper = {"title": "Peer review report", "kind": "peer-review", "abstract": "text"}
        self.assertIn("unsupported type", out_of_scope_reason(paper))


class MacroScoreTests(unittest.TestCase):
    def test_keyword_scores_favor_the_matching_macro(self):
        import numpy as np

        # Macro 0 has one keyword close to the paper; macro 1 has three weak
        # keywords. The per-keyword top mean must prefer macro 0.
        keywords = np.array(
            [
                [1.0, 0.0],
                [0.2, 1.0],
                [0.1, 1.0],
                [0.0, 1.0],
            ],
            dtype=np.float32,
        )
        spans = [(0, 1), (1, 4)]
        paper = np.array([1.0, 0.0], dtype=np.float32)
        scores = _macro_scores(spans, keywords, paper)
        self.assertGreater(scores[0], scores[1])


class TopicLabelTests(unittest.TestCase):
    def test_topic_label_uses_paper_weight_not_insertion_order(self):
        topics = {
            0: [
                "Logic, Reasoning, and Knowledge",
                "Aging, Elder Care, and Social Issues",
                "Semantic Web and Ontologies",
            ]
        }
        counts = {
            "Logic, Reasoning, and Knowledge": 29,
            "Aging, Elder Care, and Social Issues": 1,
            "Semantic Web and Ontologies": 8,
        }
        labels = label_topic_clusters(topics, counts)
        self.assertIn("Logic", labels[0])
        self.assertIn("Semantic Web", labels[0])
        self.assertNotIn("Aging", labels[0])


class ImportScopeCleanupTests(unittest.TestCase):
    def setUp(self):
        self.client = StrapiClient("http://example.invalid", "token")
        self.client._pub_records = {
            "book": {
                "openAlexId": "",
                "doi": "",
                "title": normalize_title("Love and Marriage"),
                "rawTitle": "Love and Marriage",
                "kind": "book-chapter",
                "abstract": "",
            },
            "paper": {
                "openAlexId": "",
                "doi": "",
                "title": normalize_title("A useful paper"),
                "rawTitle": "A useful paper",
                "kind": "article",
                "abstract": "",
            },
        }
        self.client._pub_source_kind = {
            "book": "openAlexAutomated",
            "paper": "openAlexAutomated",
        }
        self.client._pub_graph_eligible = {"book": True, "paper": True}
        self.client._pub_published = {"book": True, "paper": True}

    def test_unpublishes_and_disables_out_of_scope_automated_record(self):
        calls = []
        unpublished = []
        events = []

        def fake_update(document_id, payload):
            events.append("update")
            calls.append((document_id, payload))
            return True

        def fake_unpublish(document_id):
            events.append("unpublish")
            unpublished.append(document_id)
            return True

        self.client.update_publication = fake_update
        self.client.unpublish_publication = fake_unpublish
        stats = self.client.apply_import_scope()

        self.assertEqual(stats["out_of_scope"], 1)
        self.assertEqual(unpublished, ["book"])
        self.assertEqual(calls, [("book", {"graphEligible": False})])
        self.assertEqual(events, ["update", "unpublish"])
        self.assertEqual(self.client._pub_graph_eligible["paper"], True)

        # A second pass must not call Strapi again for the already-cleaned row.
        events.clear()
        second = self.client.apply_import_scope()
        self.assertEqual(second["out_of_scope"], 0)
        self.assertEqual(second["already_clean"], 1)
        self.assertEqual(events, [])


class DraftVisibilityTests(unittest.TestCase):
    class FakeResponse:
        def __init__(self, payload):
            self._payload = payload
            self.ok = True
            self.status_code = 200
            self.text = ""
            self.headers = {}

        def json(self):
            return self._payload

        def raise_for_status(self):
            return None

    def setUp(self):
        self.client = StrapiClient("http://example.invalid", "token")

    def test_bulk_load_includes_drafts_and_tracks_published_state(self):
        def fake_fetch(endpoint, params=None):
            if (params or {}).get("status") == "published":
                return [{"documentId": "published"}]
            return [
                {
                    "documentId": "published",
                    "title": "Published paper",
                    "openAlexId": "https://openalex.org/W1",
                    "sourceKind": "openAlexAutomated",
                    "graphEligible": True,
                },
                {
                    "documentId": "draft",
                    "title": "Editorially hidden paper",
                    "openAlexId": "https://openalex.org/W2",
                    "sourceKind": "openAlexAutomated",
                    "graphEligible": False,
                },
            ]

        self.client._fetch_all_pages = fake_fetch
        self.client.load_existing_publications()

        self.assertTrue(self.client.is_publication_published("published"))
        self.assertFalse(self.client.is_publication_published("draft"))
        self.assertEqual(
            self.client.find_existing_publication(openalex_id="https://openalex.org/W2")[0],
            "draft",
        )

    def test_update_keeps_a_draft_unpublished(self):
        calls = []

        def fake_request(method, url, **kwargs):
            calls.append((method, url, kwargs))
            return self.FakeResponse({"data": {"documentId": "draft"}})

        self.client._pub_published = {"draft": False, "published": True}
        self.client._request = fake_request

        self.assertTrue(self.client.update_publication("draft", {"year": 2024}))
        self.assertEqual(calls[-1][2]["params"], {"status": "draft"})

        self.assertTrue(self.client.update_publication("published", {"year": 2024}))
        self.assertIsNone(calls[-1][2]["params"])

    def test_author_merge_reads_the_draft_version(self):
        calls = []

        def fake_request(method, url, **kwargs):
            calls.append(kwargs)
            return self.FakeResponse({"data": {"authors": [{"documentId": "author-1"}]}})

        self.client._pub_published = {"draft": False}
        self.client._request = fake_request

        authors = self.client.load_publication_author_ids("draft")

        self.assertEqual(authors, ["author-1"])
        self.assertEqual(calls[-1]["params"]["status"], "draft")

    def test_remote_lookup_remembers_a_draft(self):
        responses = []

        def fake_request(method, url, **kwargs):
            params = kwargs.get("params") or {}
            if params.get("status") == "draft":
                responses.append(
                    {
                        "documentId": "draft",
                        "openAlexId": "https://openalex.org/W2",
                        "title": "Editorially hidden paper",
                        "sourceKind": "openAlexAutomated",
                        "graphEligible": False,
                    }
                )
                return self.FakeResponse({"data": responses})
            return self.FakeResponse({"data": []})

        self.client._request = fake_request
        document_id = self.client.find_publication_remote(
            openalex_id="https://openalex.org/W2"
        )

        self.assertEqual(document_id, "draft")
        self.assertFalse(self.client.is_publication_published("draft"))
        self.assertEqual(self.client.get_publication_source_kind("draft"), "openAlexAutomated")

    def test_create_conflict_does_not_adopt_a_manual_draft(self):
        self.client.load_existing_publications = lambda: None
        self.client.load_existing_people = lambda: None
        self.client.match_graph_exclusion = lambda **kwargs: None
        self.client.match_authors = lambda names, ids=None: []
        self.client.find_existing_publication = lambda **kwargs: (None, None)
        self.client.create_publication = lambda paper, author_ids=None: {
            "document_id": None,
            "error": "conflict",
        }
        self.client.find_publication_remote = lambda **kwargs: "manual-draft"
        self.client.get_publication_source_kind = lambda document_id: "manual"

        def fail_update(document_id, payload):
            raise AssertionError("manual draft must not be updated")

        self.client.update_publication = fail_update

        _pub_map, stats = upload_publications(
            self.client,
            [{"title": "A manual draft", "openAlexId": "https://openalex.org/W3"}],
            skip_pdf=True,
        )

        self.assertEqual(stats["protected_manual"], 1)
        self.assertEqual(stats["skipped"], 1)
        self.assertEqual(stats["conflict_resolved"], 1)


class ReplaceGraphLinksTests(unittest.TestCase):
    def test_new_links_are_uploaded_before_old_links_are_deleted(self):
        from unittest.mock import patch

        events = []

        class FakeStrapi:
            def load_graph_link_ids(self):
                events.append("load-old")
                return ["old-link"]

            def delete_graph_links(self, ids):
                events.append(("delete-old", ids))
                return len(ids)

        def fake_upload(strapi, links, pub_map, **kwargs):
            events.append("upload-new")
            return {"created": len(links), "failed": 0}

        with patch(
            "research_paper_graph.strapi_sync.upload_graph_links", fake_upload
        ):
            result = replace_graph_links(
                FakeStrapi(), [{"source_paper_id": "a", "target_paper_id": "b"}], {}
            )

        self.assertEqual(events, ["load-old", "upload-new", ("delete-old", ["old-link"])])
        self.assertEqual(result["created"], 1)


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
