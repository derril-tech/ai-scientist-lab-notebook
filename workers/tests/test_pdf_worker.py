import pytest
import asyncio
from unittest.mock import Mock, patch
from workers.src.workers.pdf_worker.pdf_worker import PDFWorker


class TestPDFWorker:
    @pytest.fixture
    def pdf_worker(self):
        return PDFWorker()

    @pytest.fixture
    def sample_pdf_content(self):
        return """
        Introduction
        
        This study investigates the effects of temperature on enzyme activity.
        
        Methods
        
        We conducted experiments at three different temperatures: 25°C, 37°C, and 50°C.
        Enzyme activity was measured using spectrophotometry.
        
        Results
        
        The results showed that enzyme activity peaked at 37°C.
        Activity decreased significantly at both 25°C and 50°C.
        
        Discussion
        
        These findings suggest that the enzyme has an optimal temperature range.
        Further studies are needed to understand the molecular mechanisms.
        
        References
        
        1. Smith, J. et al. (2020). Enzyme kinetics. Journal of Biochemistry.
        2. Johnson, A. et al. (2019). Temperature effects on proteins. Nature.
        """

    def test_extract_sections(self, pdf_worker, sample_pdf_content):
        """Test section extraction from PDF content"""
        sections = pdf_worker._extract_sections(sample_pdf_content)
        
        assert len(sections) >= 4
        assert any('introduction' in section.lower() for section in sections)
        assert any('methods' in section.lower() for section in sections)
        assert any('results' in section.lower() for section in sections)
        assert any('discussion' in section.lower() for section in sections)

    def test_extract_chunks(self, pdf_worker, sample_pdf_content):
        """Test chunk extraction with proper boundaries"""
        chunks = pdf_worker._extract_chunks(sample_pdf_content, max_chunk_size=200)
        
        assert len(chunks) > 0
        for chunk in chunks:
            assert len(chunk['content']) <= 200
            assert chunk['content'].strip() != ""
            assert 'page_range' in chunk
            assert 'index' in chunk

    def test_extract_captions(self, pdf_worker):
        """Test caption extraction from text"""
        text_with_captions = """
        Figure 1: Enzyme activity over time
        The graph shows the relationship between time and enzyme activity.
        
        Table 1: Experimental conditions
        Temperature, pH, and substrate concentration for each trial.
        """
        
        captions = pdf_worker._extract_captions(text_with_captions)
        
        assert len(captions) >= 2
        assert any('figure' in caption.lower() for caption in captions)
        assert any('table' in caption.lower() for caption in captions)

    def test_extract_titles(self, pdf_worker):
        """Test title extraction from text"""
        text_with_titles = """
        Effects of Temperature on Enzyme Activity
        
        Introduction
        
        This study investigates...
        
        Methods and Materials
        
        We conducted experiments...
        """
        
        titles = pdf_worker._extract_titles(text_with_titles)
        
        assert len(titles) >= 2
        assert any('effects of temperature' in title.lower() for title in titles)
        assert any('introduction' in title.lower() for title in titles)

    @patch('workers.src.workers.pdf_worker.pdf_worker.fitz')
    def test_parse_pdf_structure(self, mock_fitz, pdf_worker):
        """Test PDF structure parsing with PyMuPDF"""
        # Mock PyMuPDF document
        mock_doc = Mock()
        mock_page = Mock()
        mock_page.get_text.return_value = "Sample page content"
        mock_page.get_images.return_value = []
        mock_page.get_drawings.return_value = []
        mock_doc.__iter__.return_value = [mock_page]
        mock_doc.page_count = 1
        
        mock_fitz.open.return_value.__enter__.return_value = mock_doc
        
        result = pdf_worker._parse_pdf_structure("dummy_path.pdf")
        
        assert result is not None
        assert 'pages' in result
        assert len(result['pages']) == 1

    def test_detect_figures(self, pdf_worker):
        """Test figure detection in text"""
        text_with_figures = """
        The results are shown in Figure 1.
        Figure 2 demonstrates the relationship.
        As illustrated in Fig. 3, the data shows...
        """
        
        figures = pdf_worker._detect_figures(text_with_figures)
        
        assert len(figures) >= 3
        assert any('figure 1' in figure.lower() for figure in figures)
        assert any('figure 2' in figure.lower() for figure in figures)
        assert any('fig. 3' in figure.lower() for figure in figures)

    def test_extract_tables(self, pdf_worker):
        """Test table extraction from text"""
        text_with_tables = """
        Table 1: Experimental Results
        Temperature | Activity | Error
        25°C        | 0.5      | ±0.1
        37°C        | 1.0      | ±0.1
        50°C        | 0.3      | ±0.1
        
        Table 2: Statistical Analysis
        Parameter | Value | p-value
        F-stat    | 15.2  | <0.001
        R-squared | 0.85  | <0.001
        """
        
        tables = pdf_worker._extract_tables(text_with_tables)
        
        assert len(tables) >= 2
        assert any('table 1' in table.lower() for table in tables)
        assert any('table 2' in table.lower() for table in tables)

    def test_chunk_boundaries_respect_sections(self, pdf_worker, sample_pdf_content):
        """Test that chunk boundaries respect section boundaries"""
        chunks = pdf_worker._extract_chunks(sample_pdf_content, max_chunk_size=100)
        
        # Check that chunks don't break in the middle of important sections
        for i, chunk in enumerate(chunks):
            content = chunk['content'].lower()
            
            # If chunk contains section headers, they should be at the beginning
            if 'methods' in content or 'results' in content or 'discussion' in content:
                # Section headers should be at the start of chunks
                lines = content.split('\n')
                if any(header in lines[0] for header in ['methods', 'results', 'discussion']):
                    assert True  # This is good
                else:
                    # If not at start, it should be a continuation chunk
                    assert i > 0  # Should not be the first chunk

    def test_entity_tagging(self, pdf_worker):
        """Test entity tagging in text"""
        text_with_entities = """
        The enzyme concentration was 2.5 mM.
        The temperature was maintained at 37°C.
        The pH was adjusted to 7.4.
        The reaction time was 30 minutes.
        """
        
        entities = pdf_worker._extract_entities(text_with_entities)
        
        # Should detect measurements and units
        assert any('2.5' in entity for entity in entities)
        assert any('37°C' in entity for entity in entities)
        assert any('7.4' in entity for entity in entities)
        assert any('30 minutes' in entity for entity in entities)

    def test_unit_conversions(self, pdf_worker):
        """Test unit conversion functionality"""
        # Test temperature conversions
        assert pdf_worker._convert_units("25°C", "K") == "298.15 K"
        assert pdf_worker._convert_units("37°C", "K") == "310.15 K"
        
        # Test concentration conversions
        assert pdf_worker._convert_units("1 mM", "μM") == "1000 μM"
        assert pdf_worker._convert_units("1 M", "mM") == "1000 mM"

    @pytest.mark.asyncio
    async def test_process_document_async(self, pdf_worker):
        """Test async document processing"""
        mock_document = {
            'id': 'test-doc-1',
            'content': 'Sample document content for testing.',
            'metadata': {'pages': 1}
        }
        
        result = await pdf_worker.process_document(mock_document)
        
        assert result is not None
        assert 'chunks' in result
        assert 'figures' in result
        assert 'tables' in result
        assert len(result['chunks']) > 0


if __name__ == '__main__':
    pytest.main([__file__])
