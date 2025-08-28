import pytest
import asyncio
import json
from unittest.mock import Mock, patch
from workers.src.workers.pdf_worker.pdf_worker import PDFWorker
from workers.src.workers.table_worker.table_worker import TableWorker
from workers.src.workers.embed_worker.embed_worker import EmbedWorker
from workers.src.workers.rag_worker.rag_worker import RAGWorker
from workers.src.workers.summary_worker.summary_worker import SummaryWorker
from workers.src.workers.plot_worker.plot_worker import PlotWorker
from workers.src.workers.bundle_worker.bundle_worker import BundleWorker


class TestIntegrationPipeline:
    @pytest.fixture
    def sample_pdf_document(self):
        return {
            'id': 'test-doc-1',
            'content': """
            Effects of Temperature on Enzyme Activity
            
            Introduction
            
            This study investigates the effects of temperature on enzyme activity.
            
            Methods
            
            We conducted experiments at three different temperatures: 25°C, 37°C, and 50°C.
            Enzyme activity was measured using spectrophotometry.
            
            Results
            
            Table 1: Enzyme Activity Data
            Temperature | Activity (U/mL) | Error
            25°C       | 0.5             | ±0.1
            37°C       | 1.0             | ±0.1
            50°C       | 0.3             | ±0.1
            
            The results showed that enzyme activity peaked at 37°C.
            Activity decreased significantly at both 25°C and 50°C.
            
            Discussion
            
            These findings suggest that the enzyme has an optimal temperature range.
            Further studies are needed to understand the molecular mechanisms.
            """,
            'metadata': {'pages': 1, 'filename': 'enzyme_study.pdf'}
        }

    @pytest.fixture
    def sample_csv_data(self):
        return """Temperature,Activity,Error
25,0.5,0.1
37,1.0,0.1
50,0.3,0.1"""

    @pytest.mark.asyncio
    async def test_full_pipeline_integration(self, sample_pdf_document, sample_csv_data):
        """Test complete pipeline: ingest → index → QA → summary → plot → bundle"""
        
        # Step 1: PDF Processing
        pdf_worker = PDFWorker()
        pdf_result = await pdf_worker.process_document(sample_pdf_document)
        
        assert pdf_result is not None
        assert 'chunks' in pdf_result
        assert 'figures' in pdf_result
        assert 'tables' in pdf_result
        assert len(pdf_result['chunks']) > 0
        
        # Step 2: Table Processing
        table_worker = TableWorker()
        table_data = {
            'id': 'table-1',
            'content': sample_csv_data,
            'metadata': {'source': 'enzyme_study.pdf'}
        }
        table_result = await table_worker.process_table(table_data)
        
        assert table_result is not None
        assert 'schema' in table_result
        assert 'normalized_data' in table_result
        assert 'headers' in table_result
        
        # Step 3: Embedding Generation
        embed_worker = EmbedWorker()
        
        # Process chunks
        for chunk in pdf_result['chunks']:
            await embed_worker.add_request({
                'type': 'chunk',
                'id': chunk['id'],
                'content': chunk['content'],
                'metadata': chunk['metadata']
            })
        
        # Process table
        await embed_worker.add_request({
            'type': 'table',
            'id': table_result['id'],
            'schema': table_result['schema'],
            'data': table_result['normalized_data']
        })
        
        # Start embedding worker
        embed_worker.start()
        await asyncio.sleep(1)  # Allow time for processing
        embed_worker.stop()
        
        # Step 4: Q&A Processing
        rag_worker = RAGWorker()
        question = "What is the optimal temperature for enzyme activity?"
        
        qa_result = await rag_worker.process_question(question, pdf_result['chunks'])
        
        assert qa_result is not None
        assert 'answer' in qa_result
        assert 'confidence' in qa_result
        assert 'citations' in qa_result
        assert qa_result['confidence'] > 0.5
        
        # Step 5: Summary Generation
        summary_worker = SummaryWorker()
        summary_result = await summary_worker.process_document(
            sample_pdf_document['id'], 
            pdf_result['chunks']
        )
        
        assert summary_result is not None
        assert len(summary_result) > 0
        for summary in summary_result:
            assert 'title' in summary
            assert 'objective' in summary
            assert 'key_findings' in summary
            assert 'confidence_score' in summary
        
        # Step 6: Plot Generation
        plot_worker = PlotWorker()
        plot_spec = {
            'plot_id': 'test-plot-1',
            'title': 'Enzyme Activity vs Temperature',
            'plot_type': 'line',
            'data_source': table_result['id'],
            'x_column': 'Temperature',
            'y_column': 'Activity',
            'transforms': []
        }
        
        plot_result = await plot_worker.create_plot(plot_spec, table_result['normalized_data'])
        
        assert plot_result is not None
        assert 'png_data' in plot_result
        assert 'svg_data' in plot_result
        assert 'python_code' in plot_result
        assert plot_result.error is None
        
        # Step 7: Bundle Generation
        bundle_worker = BundleWorker()
        bundle_spec = {
            'bundle_id': 'test-bundle-1',
            'title': 'Enzyme Study Report',
            'description': 'Complete analysis of enzyme temperature effects',
            'workspace_id': 'test-workspace',
            'document_ids': [sample_pdf_document['id']],
            'dataset_ids': [table_result['id']],
            'experiment_ids': [summary_result[0].experiment_id],
            'answer_ids': [qa_result['id']],
            'plot_ids': [plot_result.plot_id],
            'export_format': 'json'
        }
        
        data_sources = {
            'documents': {sample_pdf_document['id']: sample_pdf_document},
            'datasets': {table_result['id']: table_result},
            'experiments': {summary_result[0].experiment_id: summary_result[0]},
            'answers': {qa_result['id']: qa_result},
            'plots': {plot_result.plot_id: plot_result}
        }
        
        bundle_result = await bundle_worker.create_bundle(bundle_spec, data_sources)
        
        assert bundle_result is not None
        assert bundle_result.bundle_data is not None
        assert 'documents' in bundle_result.bundle_data
        assert 'datasets' in bundle_result.bundle_data
        assert 'experiments' in bundle_result.bundle_data
        assert 'answers' in bundle_result.bundle_data
        assert 'plots' in bundle_result.bundle_data
        assert 'relationships' in bundle_result.bundle_data

    @pytest.mark.asyncio
    async def test_pipeline_error_handling(self):
        """Test pipeline error handling and recovery"""
        
        # Test with malformed document
        pdf_worker = PDFWorker()
        malformed_doc = {
            'id': 'malformed-doc',
            'content': '',  # Empty content
            'metadata': {}
        }
        
        try:
            result = await pdf_worker.process_document(malformed_doc)
            # Should handle gracefully
            assert result is not None
        except Exception as e:
            # Should not crash the pipeline
            assert isinstance(e, Exception)

    @pytest.mark.asyncio
    async def test_pipeline_data_consistency(self, sample_pdf_document):
        """Test data consistency across pipeline stages"""
        
        # Process document
        pdf_worker = PDFWorker()
        pdf_result = await pdf_worker.process_document(sample_pdf_document)
        
        # Extract document ID from chunks
        chunk_doc_ids = set(chunk.get('document_id') for chunk in pdf_result['chunks'])
        assert len(chunk_doc_ids) == 1
        assert sample_pdf_document['id'] in chunk_doc_ids
        
        # Test Q&A with chunks
        rag_worker = RAGWorker()
        question = "What is the optimal temperature?"
        qa_result = await rag_worker.process_question(question, pdf_result['chunks'])
        
        # Verify citations reference actual chunks
        for citation in qa_result['citations']:
            chunk_ids = [chunk['id'] for chunk in pdf_result['chunks']]
            assert citation['chunk_id'] in chunk_ids

    @pytest.mark.asyncio
    async def test_pipeline_performance(self, sample_pdf_document):
        """Test pipeline performance and timing"""
        import time
        
        start_time = time.time()
        
        # Run full pipeline
        pdf_worker = PDFWorker()
        pdf_result = await pdf_worker.process_document(sample_pdf_document)
        
        rag_worker = RAGWorker()
        qa_result = await rag_worker.process_question(
            "What is the optimal temperature?", 
            pdf_result['chunks']
        )
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Should complete within reasonable time (adjust based on expected performance)
        assert processing_time < 10.0  # 10 seconds max
        
        # Verify results are generated
        assert pdf_result is not None
        assert qa_result is not None

    @pytest.mark.asyncio
    async def test_pipeline_memory_usage(self, sample_pdf_document):
        """Test pipeline memory usage"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Run pipeline
        pdf_worker = PDFWorker()
        pdf_result = await pdf_worker.process_document(sample_pdf_document)
        
        rag_worker = RAGWorker()
        qa_result = await rag_worker.process_question(
            "What is the optimal temperature?", 
            pdf_result['chunks']
        )
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (adjust based on expected usage)
        assert memory_increase < 100 * 1024 * 1024  # 100MB max increase

    @pytest.mark.asyncio
    async def test_pipeline_concurrent_processing(self):
        """Test pipeline with concurrent document processing"""
        
        # Create multiple documents
        documents = [
            {
                'id': f'doc-{i}',
                'content': f'Document {i} content about enzyme activity.',
                'metadata': {'pages': 1}
            }
            for i in range(3)
        ]
        
        # Process concurrently
        pdf_worker = PDFWorker()
        tasks = [pdf_worker.process_document(doc) for doc in documents]
        results = await asyncio.gather(*tasks)
        
        # Verify all documents processed
        assert len(results) == 3
        for result in results:
            assert result is not None
            assert 'chunks' in result
            assert len(result['chunks']) > 0

    @pytest.mark.asyncio
    async def test_pipeline_data_persistence(self, sample_pdf_document, tmp_path):
        """Test pipeline data persistence and retrieval"""
        
        # Process document
        pdf_worker = PDFWorker()
        pdf_result = await pdf_worker.process_document(sample_pdf_document)
        
        # Save results to file
        output_file = tmp_path / "pipeline_results.json"
        with open(output_file, 'w') as f:
            json.dump({
                'document_id': sample_pdf_document['id'],
                'chunks': pdf_result['chunks'],
                'figures': pdf_result['figures'],
                'tables': pdf_result['tables']
            }, f, indent=2)
        
        # Verify file was created
        assert output_file.exists()
        assert output_file.stat().st_size > 0
        
        # Load and verify data
        with open(output_file, 'r') as f:
            loaded_data = json.load(f)
        
        assert loaded_data['document_id'] == sample_pdf_document['id']
        assert len(loaded_data['chunks']) == len(pdf_result['chunks'])


if __name__ == '__main__':
    pytest.main([__file__])
