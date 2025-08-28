"""
Summary Worker for AI Scientist Lab Notebook

Handles experiment span detection, structured summary generation,
confidence scoring, and figure/table linking.
"""

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from datetime import datetime

import structlog
from pydantic import BaseModel, Field

logger = structlog.get_logger(__name__)


@dataclass
class ExperimentSpan:
    """Represents a detected experiment span in a document"""
    start_chunk_id: str
    end_chunk_id: str
    title: str
    confidence: float
    method_section: Optional[str] = None
    results_section: Optional[str] = None
    limitations_section: Optional[str] = None


class StructuredSummary(BaseModel):
    """Structured summary schema for experiments"""
    experiment_id: str
    title: str
    objective: str
    methodology: str
    dataset_description: str
    key_findings: List[str]
    limitations: List[str]
    confidence_score: float = Field(ge=0.0, le=1.0)
    linked_figures: List[str] = Field(default_factory=list)
    linked_tables: List[str] = Field(default_factory=list)
    linked_citations: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SummaryWorker:
    """Worker for generating experiment summaries with confidence scoring"""
    
    def __init__(self):
        self.logger = logger.bind(worker="summary")
        self.experiment_keywords = {
            "methodology": ["method", "methodology", "procedure", "protocol", "experiment", "study"],
            "results": ["result", "finding", "outcome", "conclusion", "observation"],
            "limitations": ["limitation", "constraint", "caveat", "drawback", "weakness"]
        }
    
    async def process_document(self, document_id: str, chunks: List[Dict]) -> List[StructuredSummary]:
        """
        Process a document to detect experiments and generate summaries
        
        Args:
            document_id: ID of the document to process
            chunks: List of document chunks with content and metadata
            
        Returns:
            List of structured summaries for detected experiments
        """
        self.logger.info("Processing document for experiment summaries", 
                        document_id=document_id, chunk_count=len(chunks))
        
        # Detect experiment spans
        experiment_spans = await self._detect_experiment_spans(chunks)
        
        # Generate summaries for each experiment
        summaries = []
        for span in experiment_spans:
            summary = await self._generate_experiment_summary(document_id, span, chunks)
            if summary:
                summaries.append(summary)
        
        self.logger.info("Generated experiment summaries", 
                        document_id=document_id, summary_count=len(summaries))
        
        return summaries
    
    async def _detect_experiment_spans(self, chunks: List[Dict]) -> List[ExperimentSpan]:
        """
        Detect experiment spans in document chunks
        
        Args:
            chunks: List of document chunks
            
        Returns:
            List of detected experiment spans
        """
        spans = []
        
        for i, chunk in enumerate(chunks):
            # Look for experiment indicators
            if self._is_experiment_start(chunk):
                # Find the end of this experiment
                end_idx = self._find_experiment_end(chunks, i)
                
                span = ExperimentSpan(
                    start_chunk_id=chunk.get("id"),
                    end_chunk_id=chunks[end_idx].get("id") if end_idx < len(chunks) else chunk.get("id"),
                    title=self._extract_experiment_title(chunk),
                    confidence=self._calculate_span_confidence(chunks[i:end_idx+1]),
                    method_section=self._extract_method_section(chunks[i:end_idx+1]),
                    results_section=self._extract_results_section(chunks[i:end_idx+1]),
                    limitations_section=self._extract_limitations_section(chunks[i:end_idx+1])
                )
                spans.append(span)
        
        return spans
    
    def _is_experiment_start(self, chunk: Dict) -> bool:
        """Check if a chunk indicates the start of an experiment"""
        content = chunk.get("content", "").lower()
        
        # Look for experiment indicators
        experiment_indicators = [
            "experiment", "study", "investigation", "analysis",
            "we conducted", "we performed", "we analyzed",
            "the experiment", "this study", "our investigation"
        ]
        
        return any(indicator in content for indicator in experiment_indicators)
    
    def _find_experiment_end(self, chunks: List[Dict], start_idx: int) -> int:
        """Find the end of an experiment starting from start_idx"""
        for i in range(start_idx + 1, len(chunks)):
            chunk = chunks[i]
            content = chunk.get("content", "").lower()
            
            # Look for section breaks or new experiments
            if any(phrase in content for phrase in ["conclusion", "discussion", "results", "methods"]):
                return i - 1
        
        return len(chunks) - 1
    
    def _extract_experiment_title(self, chunk: Dict) -> str:
        """Extract experiment title from chunk"""
        content = chunk.get("content", "")
        
        # Simple heuristic: look for capitalized phrases that might be titles
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if line and line[0].isupper() and len(line) < 200:
                return line
        
        return "Experiment"  # Fallback
    
    def _calculate_span_confidence(self, chunks: List[Dict]) -> float:
        """Calculate confidence score for experiment span detection"""
        if not chunks:
            return 0.0
        
        # Count experiment-related keywords
        total_keywords = 0
        total_content = 0
        
        for chunk in chunks:
            content = chunk.get("content", "").lower()
            total_content += len(content)
            
            for category, keywords in self.experiment_keywords.items():
                total_keywords += sum(1 for keyword in keywords if keyword in content)
        
        if total_content == 0:
            return 0.0
        
        # Normalize by content length and keyword density
        keyword_density = total_keywords / total_content
        confidence = min(1.0, keyword_density * 1000)  # Scale factor
        
        return round(confidence, 3)
    
    def _extract_method_section(self, chunks: List[Dict]) -> Optional[str]:
        """Extract methodology section from experiment chunks"""
        method_content = []
        
        for chunk in chunks:
            content = chunk.get("content", "")
            if any(keyword in content.lower() for keyword in self.experiment_keywords["methodology"]):
                method_content.append(content)
        
        return "\n".join(method_content) if method_content else None
    
    def _extract_results_section(self, chunks: List[Dict]) -> Optional[str]:
        """Extract results section from experiment chunks"""
        results_content = []
        
        for chunk in chunks:
            content = chunk.get("content", "")
            if any(keyword in content.lower() for keyword in self.experiment_keywords["results"]):
                results_content.append(content)
        
        return "\n".join(results_content) if results_content else None
    
    def _extract_limitations_section(self, chunks: List[Dict]) -> Optional[str]:
        """Extract limitations section from experiment chunks"""
        limitations_content = []
        
        for chunk in chunks:
            content = chunk.get("content", "")
            if any(keyword in content.lower() for keyword in self.experiment_keywords["limitations"]):
                limitations_content.append(content)
        
        return "\n".join(limitations_content) if limitations_content else None
    
    async def _generate_experiment_summary(self, document_id: str, span: ExperimentSpan, chunks: List[Dict]) -> Optional[StructuredSummary]:
        """
        Generate structured summary for an experiment
        
        Args:
            document_id: ID of the document
            span: Experiment span
            chunks: All document chunks
            
        Returns:
            Structured summary or None if generation fails
        """
        try:
            # Extract relevant chunks for this experiment
            experiment_chunks = [
                chunk for chunk in chunks 
                if chunk.get("id") in [span.start_chunk_id, span.end_chunk_id]
            ]
            
            # Generate summary using LLM (placeholder for now)
            summary_data = await self._generate_summary_with_llm(experiment_chunks, span)
            
            if not summary_data:
                return None
            
            # Link figures and tables
            linked_figures = await self._link_figures(experiment_chunks)
            linked_tables = await self._link_tables(experiment_chunks)
            
            summary = StructuredSummary(
                experiment_id=f"{document_id}_{span.start_chunk_id}",
                title=summary_data.get("title", span.title),
                objective=summary_data.get("objective", ""),
                methodology=summary_data.get("methodology", span.method_section or ""),
                dataset_description=summary_data.get("dataset_description", ""),
                key_findings=summary_data.get("key_findings", []),
                limitations=summary_data.get("limitations", []),
                confidence_score=span.confidence,
                linked_figures=linked_figures,
                linked_tables=linked_tables,
                linked_citations=summary_data.get("citations", []),
                metadata={
                    "span_start": span.start_chunk_id,
                    "span_end": span.end_chunk_id,
                    "method_section": span.method_section,
                    "results_section": span.results_section,
                    "limitations_section": span.limitations_section
                }
            )
            
            return summary
            
        except Exception as e:
            self.logger.error("Failed to generate experiment summary", 
                            document_id=document_id, span=span, error=str(e))
            return None
    
    async def _generate_summary_with_llm(self, chunks: List[Dict], span: ExperimentSpan) -> Optional[Dict]:
        """
        Generate summary using LLM (placeholder implementation)
        
        In a real implementation, this would call an LLM API to generate
        structured summaries based on the experiment content.
        """
        # Placeholder: return mock summary data
        # TODO: Implement actual LLM integration
        
        content = "\n".join(chunk.get("content", "") for chunk in chunks)
        
        # Simple heuristic-based summary generation
        summary_data = {
            "title": span.title,
            "objective": self._extract_objective(content),
            "methodology": span.method_section or "Methodology details extracted from document",
            "dataset_description": self._extract_dataset_info(content),
            "key_findings": self._extract_key_findings(content),
            "limitations": self._extract_limitations(content),
            "citations": []
        }
        
        return summary_data
    
    def _extract_objective(self, content: str) -> str:
        """Extract experiment objective from content"""
        # Look for objective indicators
        objective_indicators = [
            "objective", "goal", "aim", "purpose", "hypothesis",
            "we aimed to", "the goal was", "our objective"
        ]
        
        lines = content.split('\n')
        for line in lines:
            line_lower = line.lower()
            if any(indicator in line_lower for indicator in objective_indicators):
                return line.strip()
        
        return "Objective extracted from experiment context"
    
    def _extract_dataset_info(self, content: str) -> str:
        """Extract dataset information from content"""
        # Look for dataset indicators
        dataset_indicators = [
            "dataset", "data", "sample", "participants", "subjects",
            "n=", "sample size", "population"
        ]
        
        lines = content.split('\n')
        for line in lines:
            line_lower = line.lower()
            if any(indicator in line_lower for indicator in dataset_indicators):
                return line.strip()
        
        return "Dataset information extracted from experiment context"
    
    def _extract_key_findings(self, content: str) -> List[str]:
        """Extract key findings from content"""
        findings = []
        
        # Look for finding indicators
        finding_indicators = [
            "found", "discovered", "observed", "resulted in", "showed",
            "demonstrated", "revealed", "indicated", "suggested"
        ]
        
        sentences = content.split('.')
        for sentence in sentences:
            sentence_lower = sentence.lower()
            if any(indicator in sentence_lower for indicator in finding_indicators):
                findings.append(sentence.strip())
        
        return findings[:5]  # Limit to 5 key findings
    
    def _extract_limitations(self, content: str) -> List[str]:
        """Extract limitations from content"""
        limitations = []
        
        # Look for limitation indicators
        limitation_indicators = [
            "limitation", "constraint", "caveat", "drawback", "weakness",
            "however", "although", "despite", "nevertheless"
        ]
        
        sentences = content.split('.')
        for sentence in sentences:
            sentence_lower = sentence.lower()
            if any(indicator in sentence_lower for indicator in limitation_indicators):
                limitations.append(sentence.strip())
        
        return limitations[:3]  # Limit to 3 limitations
    
    async def _link_figures(self, chunks: List[Dict]) -> List[str]:
        """Link figures referenced in experiment chunks"""
        figure_ids = []
        
        for chunk in chunks:
            # Look for figure references in metadata
            figures = chunk.get("figures", [])
            for figure in figures:
                figure_ids.append(figure.get("id"))
        
        return list(set(figure_ids))  # Remove duplicates
    
    async def _link_tables(self, chunks: List[Dict]) -> List[str]:
        """Link tables referenced in experiment chunks"""
        table_ids = []
        
        for chunk in chunks:
            # Look for table references in metadata
            tables = chunk.get("tables", [])
            for table in tables:
                table_ids.append(table.get("id"))
        
        return list(set(table_ids))  # Remove duplicates
