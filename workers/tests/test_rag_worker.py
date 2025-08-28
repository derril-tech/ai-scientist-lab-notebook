import pytest
import asyncio
from unittest.mock import Mock, patch
from workers.src.workers.rag_worker.rag_worker import RAGWorker


class TestRAGWorker:
    @pytest.fixture
    def rag_worker(self):
        return RAGWorker()

    @pytest.fixture
    def sample_chunks(self):
        return [
            {
                'id': 'chunk-1',
                'content': 'The enzyme activity was measured at 37°C.',
                'metadata': {'page': 1, 'section': 'methods'}
            },
            {
                'id': 'chunk-2', 
                'content': 'Results showed peak activity at 37°C with 2.5 mM substrate.',
                'metadata': {'page': 2, 'section': 'results'}
            },
            {
                'id': 'chunk-3',
                'content': 'The optimal temperature for this enzyme is 37°C.',
                'metadata': {'page': 3, 'section': 'discussion'}
            }
        ]

    @pytest.fixture
    def sample_question(self):
        return "What is the optimal temperature for enzyme activity?"

    def test_plan_answer(self, rag_worker, sample_question):
        """Test answer planning with citations-first approach"""
        plan = rag_worker._plan_answer(sample_question)
        
        assert plan is not None
        assert 'strategy' in plan
        assert 'required_evidence' in plan
        assert 'citation_requirements' in plan

    def test_retrieve_evidence(self, rag_worker, sample_question, sample_chunks):
        """Test evidence retrieval from chunks"""
        evidence = rag_worker._retrieve_evidence(sample_question, sample_chunks)
        
        assert len(evidence) > 0
        for item in evidence:
            assert 'chunk_id' in item
            assert 'content' in item
            assert 'score' in item
            assert item['score'] > 0

    def test_generate_answer_with_sufficient_evidence(self, rag_worker, sample_question, sample_chunks):
        """Test answer generation when sufficient evidence is available"""
        evidence = [
            {
                'chunk_id': 'chunk-1',
                'content': 'The enzyme activity was measured at 37°C.',
                'score': 0.95
            },
            {
                'chunk_id': 'chunk-2',
                'content': 'Results showed peak activity at 37°C.',
                'score': 0.92
            }
        ]
        
        answer = rag_worker._generate_answer(sample_question, evidence)
        
        assert answer is not None
        assert 'answer' in answer
        assert 'confidence' in answer
        assert 'citations' in answer
        assert len(answer['citations']) > 0
        assert answer['confidence'] > 0.5

    def test_generate_answer_with_insufficient_evidence(self, rag_worker, sample_question):
        """Test answer generation when insufficient evidence is available"""
        evidence = [
            {
                'chunk_id': 'chunk-1',
                'content': 'Some unrelated content.',
                'score': 0.3
            }
        ]
        
        answer = rag_worker._generate_answer(sample_question, evidence)
        
        assert answer is not None
        assert 'answer' in answer
        assert 'confidence' in answer
        assert answer['confidence'] < 0.5
        assert 'insufficient evidence' in answer['answer'].lower()

    def test_citation_coverage(self, rag_worker, sample_question, sample_chunks):
        """Test that citations cover all claims in the answer"""
        evidence = [
            {
                'chunk_id': 'chunk-1',
                'content': 'The enzyme activity was measured at 37°C.',
                'score': 0.95
            },
            {
                'chunk_id': 'chunk-2',
                'content': 'Results showed peak activity at 37°C with 2.5 mM substrate.',
                'score': 0.92
            }
        ]
        
        answer = rag_worker._generate_answer(sample_question, evidence)
        
        # Check that all claims have citations
        citations = answer['citations']
        assert len(citations) >= 2
        
        # Check citation quality
        for citation in citations:
            assert 'chunk_id' in citation
            assert 'score' in citation
            assert citation['score'] > 0.5

    def test_contradiction_detection(self, rag_worker):
        """Test detection of contradictions in evidence"""
        contradictory_evidence = [
            {
                'chunk_id': 'chunk-1',
                'content': 'The optimal temperature is 37°C.',
                'score': 0.95
            },
            {
                'chunk_id': 'chunk-2',
                'content': 'The optimal temperature is 25°C.',
                'score': 0.92
            }
        ]
        
        contradictions = rag_worker._detect_contradictions(contradictory_evidence)
        
        assert len(contradictions) > 0
        assert any('temperature' in contradiction.lower() for contradiction in contradictions)

    def test_evidence_gating(self, rag_worker, sample_question):
        """Test evidence gating mechanism"""
        # Test with high-quality evidence
        good_evidence = [
            {
                'chunk_id': 'chunk-1',
                'content': 'The enzyme activity was measured at 37°C.',
                'score': 0.95
            }
        ]
        
        should_proceed = rag_worker._check_evidence_quality(good_evidence)
        assert should_proceed is True
        
        # Test with low-quality evidence
        poor_evidence = [
            {
                'chunk_id': 'chunk-1',
                'content': 'Some unrelated content.',
                'score': 0.2
            }
        ]
        
        should_proceed = rag_worker._check_evidence_quality(poor_evidence)
        assert should_proceed is False

    def test_hybrid_retrieval(self, rag_worker, sample_question, sample_chunks):
        """Test hybrid retrieval combining BM25 and vector search"""
        results = rag_worker._hybrid_retrieve(sample_question, sample_chunks)
        
        assert len(results) > 0
        for result in results:
            assert 'chunk_id' in result
            assert 'content' in result
            assert 'bm25_score' in result
            assert 'vector_score' in result
            assert 'combined_score' in result

    def test_reranker(self, rag_worker, sample_question, sample_chunks):
        """Test reranking of retrieved results"""
        initial_results = [
            {
                'chunk_id': 'chunk-1',
                'content': 'The enzyme activity was measured at 37°C.',
                'score': 0.8
            },
            {
                'chunk_id': 'chunk-2',
                'content': 'Some background information.',
                'score': 0.6
            }
        ]
        
        reranked = rag_worker._rerank_results(sample_question, initial_results)
        
        assert len(reranked) == len(initial_results)
        # Check that scores are updated
        assert reranked[0]['reranked_score'] != reranked[0]['score']

    def test_faithfulness_check(self, rag_worker, sample_question):
        """Test faithfulness of generated answers to evidence"""
        evidence = [
            {
                'chunk_id': 'chunk-1',
                'content': 'The enzyme activity was measured at 37°C.',
                'score': 0.95
            }
        ]
        
        answer = "The optimal temperature for enzyme activity is 37°C."
        
        faithfulness_score = rag_worker._check_faithfulness(answer, evidence)
        
        assert faithfulness_score > 0.8  # Should be high for faithful answer

    def test_precision_recall_calculation(self, rag_worker):
        """Test precision and recall calculation for answer evaluation"""
        ground_truth = "The optimal temperature is 37°C."
        generated_answer = "The optimal temperature for enzyme activity is 37°C."
        
        precision, recall = rag_worker._calculate_precision_recall(generated_answer, ground_truth)
        
        assert precision > 0.8
        assert recall > 0.8

    @pytest.mark.asyncio
    async def test_process_question_async(self, rag_worker, sample_question, sample_chunks):
        """Test async question processing"""
        result = await rag_worker.process_question(sample_question, sample_chunks)
        
        assert result is not None
        assert 'answer' in result
        assert 'confidence' in result
        assert 'citations' in result
        assert 'reasoning' in result

    def test_table_aware_retrieval(self, rag_worker):
        """Test table-aware retrieval for questions about data"""
        question = "What is the enzyme activity at 37°C?"
        chunks_with_tables = [
            {
                'id': 'chunk-1',
                'content': 'Table 1 shows enzyme activity data.',
                'metadata': {'has_table': True, 'table_data': 'Temperature,Activity\n37°C,1.0\n25°C,0.5'}
            }
        ]
        
        results = rag_worker._table_aware_retrieve(question, chunks_with_tables)
        
        assert len(results) > 0
        # Should prioritize table-containing chunks for data questions
        assert any('table' in result['content'].lower() for result in results)

    def test_evidence_synthesis(self, rag_worker, sample_question):
        """Test synthesis of multiple evidence pieces"""
        evidence = [
            {
                'chunk_id': 'chunk-1',
                'content': 'The enzyme activity was measured at 37°C.',
                'score': 0.95
            },
            {
                'chunk_id': 'chunk-2',
                'content': 'Results showed peak activity at 37°C with 2.5 mM substrate.',
                'score': 0.92
            }
        ]
        
        synthesized = rag_worker._synthesize_evidence(evidence)
        
        assert synthesized is not None
        assert 'combined_content' in synthesized
        assert 'confidence' in synthesized
        assert synthesized['confidence'] > 0.9  # High confidence with multiple sources


if __name__ == '__main__':
    pytest.main([__file__])
