"""
Bundle Worker for AI Scientist Lab Notebook

Handles notebook/report composition and JSON bundle generation
with documents, chunks, tables, datasets, experiments, answers, citations, and plots.
"""

import asyncio
import json
import zipfile
import io
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pathlib import Path

import pandas as pd
from pydantic import BaseModel, Field

import structlog

logger = structlog.get_logger(__name__)


class BundleSpec(BaseModel):
    """Bundle specification schema"""
    bundle_id: str
    title: str
    description: Optional[str] = None
    workspace_id: str
    document_ids: List[str] = Field(default_factory=list)
    dataset_ids: List[str] = Field(default_factory=list)
    experiment_ids: List[str] = Field(default_factory=list)
    answer_ids: List[str] = Field(default_factory=list)
    plot_ids: List[str] = Field(default_factory=list)
    include_metadata: bool = True
    include_raw_data: bool = False
    export_format: str = "json"  # json, zip, pdf, html
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BundleResult(BaseModel):
    """Bundle generation result"""
    bundle_id: str
    spec: BundleSpec
    bundle_data: Optional[Dict[str, Any]] = None
    zip_data: Optional[bytes] = None
    pdf_data: Optional[bytes] = None
    html_data: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BundleWorker:
    """Worker for creating notebook/report bundles"""
    
    def __init__(self):
        self.logger = logger.bind(worker="bundle")
    
    async def create_bundle(self, spec: BundleSpec, data_sources: Dict[str, Any]) -> BundleResult:
        """
        Create a bundle based on specification and data sources
        
        Args:
            spec: Bundle specification
            data_sources: Dictionary containing all data sources (documents, datasets, etc.)
            
        Returns:
            Bundle result with generated content
        """
        try:
            self.logger.info("Creating bundle", bundle_id=spec.bundle_id, format=spec.export_format)
            
            # Collect all data for the bundle
            bundle_data = await self._collect_bundle_data(spec, data_sources)
            
            # Generate output based on format
            if spec.export_format == "json":
                return await self._create_json_bundle(spec, bundle_data)
            elif spec.export_format == "zip":
                return await self._create_zip_bundle(spec, bundle_data)
            elif spec.export_format == "pdf":
                return await self._create_pdf_bundle(spec, bundle_data)
            elif spec.export_format == "html":
                return await self._create_html_bundle(spec, bundle_data)
            else:
                raise ValueError(f"Unsupported export format: {spec.export_format}")
                
        except Exception as e:
            self.logger.error("Failed to create bundle", bundle_id=spec.bundle_id, error=str(e))
            return BundleResult(
                bundle_id=spec.bundle_id,
                spec=spec,
                error=str(e)
            )
    
    async def _collect_bundle_data(self, spec: BundleSpec, data_sources: Dict[str, Any]) -> Dict[str, Any]:
        """
        Collect all data for the bundle based on specification
        
        Args:
            spec: Bundle specification
            data_sources: Available data sources
            
        Returns:
            Collected bundle data
        """
        bundle_data = {
            "bundle_id": spec.bundle_id,
            "title": spec.title,
            "description": spec.description,
            "workspace_id": spec.workspace_id,
            "created_at": spec.created_at.isoformat(),
            "metadata": spec.metadata,
            "documents": [],
            "datasets": [],
            "experiments": [],
            "answers": [],
            "plots": [],
            "relationships": []
        }
        
        # Collect documents
        if spec.document_ids:
            documents = data_sources.get("documents", {})
            for doc_id in spec.document_ids:
                if doc_id in documents:
                    doc_data = documents[doc_id]
                    if spec.include_metadata:
                        bundle_data["documents"].append({
                            "id": doc_id,
                            "title": doc_data.get("title"),
                            "filename": doc_data.get("filename"),
                            "metadata": doc_data.get("metadata", {}),
                            "chunks": doc_data.get("chunks", [])
                        })
                    else:
                        bundle_data["documents"].append({
                            "id": doc_id,
                            "title": doc_data.get("title"),
                            "filename": doc_data.get("filename")
                        })
        
        # Collect datasets
        if spec.dataset_ids:
            datasets = data_sources.get("datasets", {})
            for dataset_id in spec.dataset_ids:
                if dataset_id in datasets:
                    dataset_data = datasets[dataset_id]
                    if spec.include_raw_data:
                        bundle_data["datasets"].append(dataset_data)
                    else:
                        bundle_data["datasets"].append({
                            "id": dataset_id,
                            "name": dataset_data.get("name"),
                            "description": dataset_data.get("description"),
                            "schema": dataset_data.get("schema"),
                            "row_count": dataset_data.get("row_count"),
                            "metadata": dataset_data.get("metadata", {})
                        })
        
        # Collect experiments
        if spec.experiment_ids:
            experiments = data_sources.get("experiments", {})
            for exp_id in spec.experiment_ids:
                if exp_id in experiments:
                    bundle_data["experiments"].append(experiments[exp_id])
        
        # Collect answers
        if spec.answer_ids:
            answers = data_sources.get("answers", {})
            for answer_id in spec.answer_ids:
                if answer_id in answers:
                    answer_data = answers[answer_id]
                    bundle_data["answers"].append({
                        "id": answer_id,
                        "question": answer_data.get("question"),
                        "answer": answer_data.get("answer"),
                        "confidence": answer_data.get("confidence"),
                        "citations": answer_data.get("citations", []),
                        "created_at": answer_data.get("created_at")
                    })
        
        # Collect plots
        if spec.plot_ids:
            plots = data_sources.get("plots", {})
            for plot_id in spec.plot_ids:
                if plot_id in plots:
                    plot_data = plots[plot_id]
                    bundle_data["plots"].append({
                        "id": plot_id,
                        "title": plot_data.get("title"),
                        "plot_type": plot_data.get("plot_type"),
                        "spec": plot_data.get("spec"),
                        "python_code": plot_data.get("python_code"),
                        "created_at": plot_data.get("created_at")
                    })
        
        # Build relationships
        bundle_data["relationships"] = await self._build_relationships(bundle_data)
        
        return bundle_data
    
    async def _build_relationships(self, bundle_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Build relationships between bundle components"""
        relationships = []
        
        # Document -> Chunk relationships
        for doc in bundle_data["documents"]:
            for chunk in doc.get("chunks", []):
                relationships.append({
                    "type": "document_contains_chunk",
                    "source": doc["id"],
                    "target": chunk.get("id"),
                    "metadata": {
                        "chunk_index": chunk.get("index"),
                        "page_range": chunk.get("page_range")
                    }
                })
        
        # Answer -> Citation relationships
        for answer in bundle_data["answers"]:
            for citation in answer.get("citations", []):
                relationships.append({
                    "type": "answer_cites",
                    "source": answer["id"],
                    "target": citation.get("document_id"),
                    "metadata": {
                        "chunk_id": citation.get("chunk_id"),
                        "page": citation.get("page"),
                        "score": citation.get("score")
                    }
                })
        
        # Experiment -> Document relationships
        for exp in bundle_data["experiments"]:
            for doc_id in exp.get("document_ids", []):
                relationships.append({
                    "type": "experiment_from_document",
                    "source": exp["id"],
                    "target": doc_id,
                    "metadata": {
                        "confidence": exp.get("confidence_score")
                    }
                })
        
        # Plot -> Dataset relationships
        for plot in bundle_data["plots"]:
            spec = plot.get("spec", {})
            data_source = spec.get("data_source")
            if data_source:
                relationships.append({
                    "type": "plot_visualizes_dataset",
                    "source": plot["id"],
                    "target": data_source,
                    "metadata": {
                        "plot_type": plot["plot_type"],
                        "columns": [spec.get("x_column"), spec.get("y_column")]
                    }
                })
        
        return relationships
    
    async def _create_json_bundle(self, spec: BundleSpec, bundle_data: Dict[str, Any]) -> BundleResult:
        """Create JSON bundle"""
        return BundleResult(
            bundle_id=spec.bundle_id,
            spec=spec,
            bundle_data=bundle_data
        )
    
    async def _create_zip_bundle(self, spec: BundleSpec, bundle_data: Dict[str, Any]) -> BundleResult:
        """Create ZIP bundle with all data and files"""
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add bundle metadata
            zip_file.writestr(
                "bundle.json",
                json.dumps(bundle_data, indent=2, default=str)
            )
            
            # Add README
            readme_content = self._generate_readme(bundle_data)
            zip_file.writestr("README.md", readme_content)
            
            # Add documents
            for doc in bundle_data.get("documents", []):
                doc_dir = f"documents/{doc['id']}"
                zip_file.writestr(f"{doc_dir}/metadata.json", json.dumps(doc, indent=2, default=str))
                
                # Add chunks if available
                for chunk in doc.get("chunks", []):
                    zip_file.writestr(
                        f"{doc_dir}/chunks/{chunk.get('id', 'chunk')}.json",
                        json.dumps(chunk, indent=2, default=str)
                    )
            
            # Add datasets
            for dataset in bundle_data.get("datasets", []):
                dataset_dir = f"datasets/{dataset['id']}"
                zip_file.writestr(f"{dataset_dir}/metadata.json", json.dumps(dataset, indent=2, default=str))
                
                # Add raw data if available
                if "data" in dataset:
                    df = pd.DataFrame(dataset["data"])
                    csv_buffer = io.StringIO()
                    df.to_csv(csv_buffer, index=False)
                    zip_file.writestr(f"{dataset_dir}/data.csv", csv_buffer.getvalue())
            
            # Add experiments
            for exp in bundle_data.get("experiments", []):
                zip_file.writestr(
                    f"experiments/{exp['id']}.json",
                    json.dumps(exp, indent=2, default=str)
                )
            
            # Add answers
            for answer in bundle_data.get("answers", []):
                zip_file.writestr(
                    f"answers/{answer['id']}.json",
                    json.dumps(answer, indent=2, default=str)
                )
            
            # Add plots
            for plot in bundle_data.get("plots", []):
                plot_dir = f"plots/{plot['id']}"
                zip_file.writestr(f"{plot_dir}/metadata.json", json.dumps(plot, indent=2, default=str))
                
                # Add Python code
                if plot.get("python_code"):
                    zip_file.writestr(f"{plot_dir}/plot_code.py", plot["python_code"])
            
            # Add relationships
            zip_file.writestr(
                "relationships.json",
                json.dumps(bundle_data.get("relationships", []), indent=2, default=str)
            )
        
        return BundleResult(
            bundle_id=spec.bundle_id,
            spec=spec,
            zip_data=zip_buffer.getvalue()
        )
    
    async def _create_pdf_bundle(self, spec: BundleSpec, bundle_data: Dict[str, Any]) -> BundleResult:
        """Create PDF bundle (placeholder implementation)"""
        # TODO: Implement PDF generation using a library like reportlab or weasyprint
        self.logger.warning("PDF bundle generation not yet implemented")
        
        return BundleResult(
            bundle_id=spec.bundle_id,
            spec=spec,
            error="PDF bundle generation not yet implemented"
        )
    
    async def _create_html_bundle(self, spec: BundleSpec, bundle_data: Dict[str, Any]) -> BundleResult:
        """Create HTML bundle"""
        html_content = self._generate_html_report(bundle_data)
        
        return BundleResult(
            bundle_id=spec.bundle_id,
            spec=spec,
            html_data=html_content
        )
    
    def _generate_readme(self, bundle_data: Dict[str, Any]) -> str:
        """Generate README content for the bundle"""
        lines = [
            f"# {bundle_data['title']}",
            "",
            bundle_data.get("description", "AI Scientist Lab Notebook Bundle"),
            "",
            f"**Bundle ID:** {bundle_data['bundle_id']}",
            f"**Created:** {bundle_data['created_at']}",
            f"**Workspace:** {bundle_data['workspace_id']}",
            "",
            "## Contents",
            ""
        ]
        
        # Document count
        doc_count = len(bundle_data.get("documents", []))
        lines.append(f"- **Documents:** {doc_count}")
        
        # Dataset count
        dataset_count = len(bundle_data.get("datasets", []))
        lines.append(f"- **Datasets:** {dataset_count}")
        
        # Experiment count
        exp_count = len(bundle_data.get("experiments", []))
        lines.append(f"- **Experiments:** {exp_count}")
        
        # Answer count
        answer_count = len(bundle_data.get("answers", []))
        lines.append(f"- **Q&A Sessions:** {answer_count}")
        
        # Plot count
        plot_count = len(bundle_data.get("plots", []))
        lines.append(f"- **Plots:** {plot_count}")
        
        lines.extend([
            "",
            "## Structure",
            "",
            "This bundle contains the following directories:",
            "",
            "- `documents/` - Document metadata and chunks",
            "- `datasets/` - Dataset metadata and raw data",
            "- `experiments/` - Experiment summaries",
            "- `answers/` - Q&A sessions with citations",
            "- `plots/` - Plot specifications and code",
            "- `relationships.json` - Relationships between components",
            "",
            "## Usage",
            "",
            "1. Extract the ZIP file",
            "2. Open `bundle.json` for an overview",
            "3. Navigate to specific directories for detailed data",
            "4. Use the Python code in `plots/` to recreate visualizations",
            "",
            "## Relationships",
            "",
            "The `relationships.json` file contains connections between:",
            "- Documents and their chunks",
            "- Answers and their citations",
            "- Experiments and source documents",
            "- Plots and their datasets"
        ])
        
        return "\n".join(lines)
    
    def _generate_html_report(self, bundle_data: Dict[str, Any]) -> str:
        """Generate HTML report for the bundle"""
        html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{bundle_data['title']}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }}
        .header {{ border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }}
        .section {{ margin-bottom: 30px; }}
        .section h2 {{ color: #2c3e50; border-left: 4px solid #3498db; padding-left: 15px; }}
        .item {{ background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }}
        .item h3 {{ margin-top: 0; color: #34495e; }}
        .metadata {{ font-size: 0.9em; color: #7f8c8d; }}
        .relationships {{ background: #ecf0f1; padding: 15px; border-radius: 5px; }}
        .relationship {{ margin: 5px 0; padding: 5px; background: white; border-radius: 3px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{bundle_data['title']}</h1>
        <p>{bundle_data.get('description', 'AI Scientist Lab Notebook Bundle')}</p>
        <div class="metadata">
            <strong>Bundle ID:</strong> {bundle_data['bundle_id']}<br>
            <strong>Created:</strong> {bundle_data['created_at']}<br>
            <strong>Workspace:</strong> {bundle_data['workspace_id']}
        </div>
    </div>
"""
        
        # Documents section
        if bundle_data.get("documents"):
            html += """
    <div class="section">
        <h2>Documents</h2>
"""
            for doc in bundle_data["documents"]:
                html += f"""
        <div class="item">
            <h3>{doc.get('title', 'Untitled')}</h3>
            <p><strong>Filename:</strong> {doc.get('filename', 'N/A')}</p>
            <p><strong>Chunks:</strong> {len(doc.get('chunks', []))}</p>
        </div>
"""
            html += "    </div>"
        
        # Datasets section
        if bundle_data.get("datasets"):
            html += """
    <div class="section">
        <h2>Datasets</h2>
"""
            for dataset in bundle_data["datasets"]:
                html += f"""
        <div class="item">
            <h3>{dataset.get('name', 'Untitled')}</h3>
            <p>{dataset.get('description', 'No description')}</p>
            <p><strong>Rows:</strong> {dataset.get('row_count', 'N/A')}</p>
        </div>
"""
            html += "    </div>"
        
        # Experiments section
        if bundle_data.get("experiments"):
            html += """
    <div class="section">
        <h2>Experiments</h2>
"""
            for exp in bundle_data["experiments"]:
                html += f"""
        <div class="item">
            <h3>{exp.get('title', 'Untitled')}</h3>
            <p><strong>Objective:</strong> {exp.get('objective', 'N/A')}</p>
            <p><strong>Confidence:</strong> {exp.get('confidence_score', 'N/A')}</p>
        </div>
"""
            html += "    </div>"
        
        # Answers section
        if bundle_data.get("answers"):
            html += """
    <div class="section">
        <h2>Q&A Sessions</h2>
"""
            for answer in bundle_data["answers"]:
                html += f"""
        <div class="item">
            <h3>Q: {answer.get('question', 'N/A')}</h3>
            <p><strong>A:</strong> {answer.get('answer', 'N/A')}</p>
            <p><strong>Confidence:</strong> {answer.get('confidence', 'N/A')}</p>
            <p><strong>Citations:</strong> {len(answer.get('citations', []))}</p>
        </div>
"""
            html += "    </div>"
        
        # Plots section
        if bundle_data.get("plots"):
            html += """
    <div class="section">
        <h2>Plots</h2>
"""
            for plot in bundle_data["plots"]:
                html += f"""
        <div class="item">
            <h3>{plot.get('title', 'Untitled')}</h3>
            <p><strong>Type:</strong> {plot.get('plot_type', 'N/A')}</p>
            <p><strong>Data Source:</strong> {plot.get('spec', {}).get('data_source', 'N/A')}</p>
        </div>
"""
            html += "    </div>"
        
        # Relationships section
        if bundle_data.get("relationships"):
            html += """
    <div class="section">
        <h2>Relationships</h2>
        <div class="relationships">
"""
            for rel in bundle_data["relationships"]:
                html += f"""
            <div class="relationship">
                <strong>{rel['type']}:</strong> {rel['source']} → {rel['target']}
            </div>
"""
            html += """
        </div>
    </div>
"""
        
        html += """
</body>
</html>
"""
        
        return html
    
    async def create_notebook_export(self, workspace_id: str, format: str = "json") -> BundleResult:
        """
        Create a complete notebook export for a workspace
        
        Args:
            workspace_id: ID of the workspace to export
            format: Export format (json, zip, html)
            
        Returns:
            Bundle result with notebook export
        """
        # This would typically fetch all data for the workspace
        # For now, return a placeholder
        spec = BundleSpec(
            bundle_id=f"notebook_{workspace_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            title=f"Notebook Export - Workspace {workspace_id}",
            description="Complete workspace export",
            workspace_id=workspace_id,
            export_format=format
        )
        
        # Placeholder data - in real implementation, this would fetch from database
        data_sources = {
            "documents": {},
            "datasets": {},
            "experiments": {},
            "answers": {},
            "plots": {}
        }
        
        return await self.create_bundle(spec, data_sources)
