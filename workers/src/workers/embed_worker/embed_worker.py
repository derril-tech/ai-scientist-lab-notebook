"""
Embed Worker implementation
Handles text and table embeddings with batching and backpressure
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
import structlog
from sentence_transformers import SentenceTransformer
import numpy as np
import pandas as pd
from dataclasses import dataclass
import time

logger = structlog.get_logger(__name__)


@dataclass
class EmbeddingRequest:
    """Embedding request data structure"""
    id: str
    text: str
    type: str  # 'text' or 'table'
    metadata: Dict[str, Any]
    priority: int = 0


class EmbedWorker:
    """Embedding processing worker for text and table data"""
    
    def __init__(self, batch_size: int = 32, max_queue_size: int = 1000):
        self.logger = logger.bind(worker="embed_worker")
        self.batch_size = batch_size
        self.max_queue_size = max_queue_size
        self.embedding_model = None
        self.request_queue = asyncio.Queue(maxsize=max_queue_size)
        self.processing = False
        
    async def start(self):
        """Start the embedding worker"""
        self.processing = True
        self.logger.info("Starting embed worker", batch_size=self.batch_size)
        
        # Load embedding model
        await self._load_embedding_model()
        
        # Start processing loop
        asyncio.create_task(self._process_loop())
    
    async def stop(self):
        """Stop the embedding worker"""
        self.processing = False
        self.logger.info("Stopping embed worker")
    
    async def add_request(self, request: EmbeddingRequest) -> bool:
        """Add embedding request to queue"""
        try:
            if self.request_queue.qsize() >= self.max_queue_size:
                self.logger.warning("Queue full, dropping request", request_id=request.id)
                return False
            
            await self.request_queue.put(request)
            return True
            
        except Exception as e:
            self.logger.error("Failed to add request to queue", 
                            request_id=request.id, error=str(e))
            return False
    
    async def process_chunks(self, chunks_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process text chunks for embedding
        
        Args:
            chunks_data: Chunks data with text content
            
        Returns:
            Chunks with embeddings
        """
        try:
            self.logger.info("Starting chunk embedding", 
                           document_id=chunks_data.get('document_id'),
                           chunks_count=len(chunks_data.get('chunks', [])))
            
            chunks = chunks_data.get('chunks', [])
            if not chunks:
                return chunks_data
            
            # Create embedding requests
            requests = []
            for chunk in chunks:
                request = EmbeddingRequest(
                    id=chunk.get('id', f"chunk_{len(requests)}"),
                    text=chunk.get('text', ''),
                    type='text',
                    metadata={
                        'document_id': chunks_data.get('document_id'),
                        'section': chunk.get('section'),
                        'page_from': chunk.get('page_from'),
                        'page_to': chunk.get('page_to')
                    }
                )
                requests.append(request)
            
            # Process embeddings
            embeddings = await self._process_embeddings(requests)
            
            # Attach embeddings to chunks
            for chunk, embedding in zip(chunks, embeddings):
                chunk['embedding'] = embedding.tolist()
            
            self.logger.info("Chunk embedding completed", 
                           document_id=chunks_data.get('document_id'),
                           chunks_count=len(chunks))
            
            return chunks_data
            
        except Exception as e:
            self.logger.error("Chunk embedding failed", 
                            document_id=chunks_data.get('document_id'),
                            error=str(e))
            raise
    
    async def process_tables(self, tables_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process tables for embedding
        
        Args:
            tables_data: Tables data with schema and content
            
        Returns:
            Tables with embeddings
        """
        try:
            self.logger.info("Starting table embedding", 
                           document_id=tables_data.get('document_id'),
                           tables_count=len(tables_data.get('tables', [])))
            
            tables = tables_data.get('tables', [])
            if not tables:
                return tables_data
            
            # Create embedding requests for table schemas and content
            requests = []
            for table in tables:
                # Embed table schema
                schema_text = self._table_schema_to_text(table.get('schema', {}))
                schema_request = EmbeddingRequest(
                    id=f"{table.get('id', 'table')}_schema",
                    text=schema_text,
                    type='table_schema',
                    metadata={
                        'document_id': tables_data.get('document_id'),
                        'table_id': table.get('id'),
                        'page': table.get('page')
                    }
                )
                requests.append(schema_request)
                
                # Embed table content (first few rows)
                content_text = self._table_content_to_text(table.get('data', []))
                content_request = EmbeddingRequest(
                    id=f"{table.get('id', 'table')}_content",
                    text=content_text,
                    type='table_content',
                    metadata={
                        'document_id': tables_data.get('document_id'),
                        'table_id': table.get('id'),
                        'page': table.get('page')
                    }
                )
                requests.append(content_request)
            
            # Process embeddings
            embeddings = await self._process_embeddings(requests)
            
            # Attach embeddings to tables
            for i, table in enumerate(tables):
                schema_emb_idx = i * 2
                content_emb_idx = i * 2 + 1
                
                table['schema_embedding'] = embeddings[schema_emb_idx].tolist()
                table['content_embedding'] = embeddings[content_emb_idx].tolist()
            
            self.logger.info("Table embedding completed", 
                           document_id=tables_data.get('document_id'),
                           tables_count=len(tables))
            
            return tables_data
            
        except Exception as e:
            self.logger.error("Table embedding failed", 
                            document_id=tables_data.get('document_id'),
                            error=str(e))
            raise
    
    async def _process_loop(self):
        """Main processing loop for embedding requests"""
        while self.processing:
            try:
                # Collect batch of requests
                batch = []
                batch_start_time = time.time()
                
                # Wait for first request
                try:
                    first_request = await asyncio.wait_for(
                        self.request_queue.get(), timeout=1.0
                    )
                    batch.append(first_request)
                except asyncio.TimeoutError:
                    continue
                
                # Collect more requests for batch
                while len(batch) < self.batch_size:
                    try:
                        request = await asyncio.wait_for(
                            self.request_queue.get(), timeout=0.1
                        )
                        batch.append(request)
                    except asyncio.TimeoutError:
                        break
                
                # Process batch
                if batch:
                    await self._process_batch(batch)
                    
                    batch_time = time.time() - batch_start_time
                    self.logger.debug("Batch processed", 
                                    batch_size=len(batch),
                                    processing_time=batch_time)
                
            except Exception as e:
                self.logger.error("Error in processing loop", error=str(e))
                await asyncio.sleep(1)  # Back off on error
    
    async def _process_batch(self, batch: List[EmbeddingRequest]):
        """Process a batch of embedding requests"""
        try:
            texts = [req.text for req in batch]
            
            # Get embeddings
            embeddings = await self._get_embeddings(texts)
            
            # TODO: Store embeddings in database
            # For now, just log the results
            for req, embedding in zip(batch, embeddings):
                self.logger.debug("Embedding generated", 
                                request_id=req.id,
                                embedding_dim=len(embedding))
                
        except Exception as e:
            self.logger.error("Batch processing failed", error=str(e))
            raise
    
    async def _process_embeddings(self, requests: List[EmbeddingRequest]) -> List[np.ndarray]:
        """Process embeddings for a list of requests"""
        try:
            texts = [req.text for req in requests]
            embeddings = await self._get_embeddings(texts)
            return embeddings
            
        except Exception as e:
            self.logger.error("Embedding processing failed", error=str(e))
            raise
    
    async def _load_embedding_model(self):
        """Load the embedding model"""
        if self.embedding_model is None:
            try:
                # TODO: Use a more appropriate model for scientific text
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
                self.logger.info("Embedding model loaded successfully")
            except Exception as e:
                self.logger.error("Failed to load embedding model", error=str(e))
                raise
    
    async def _get_embeddings(self, texts: List[str]) -> List[np.ndarray]:
        """Get embeddings for a list of texts"""
        await self._load_embedding_model()
        
        try:
            # Batch encode texts
            embeddings = self.embedding_model.encode(texts, convert_to_tensor=True)
            
            # Convert to numpy arrays
            embeddings_np = embeddings.cpu().numpy()
            
            return [emb for emb in embeddings_np]
            
        except Exception as e:
            self.logger.error("Failed to generate embeddings", error=str(e))
            raise
    
    def _table_schema_to_text(self, schema: Dict[str, Any]) -> str:
        """Convert table schema to text for embedding"""
        if not schema or 'columns' not in schema:
            return ""
        
        schema_parts = []
        for col in schema['columns']:
            col_text = f"Column: {col.get('name', 'unknown')}"
            col_text += f", Type: {col.get('type', 'unknown')}"
            
            if col.get('unit'):
                col_text += f", Unit: {col['unit']}"
            
            schema_parts.append(col_text)
        
        return "; ".join(schema_parts)
    
    def _table_content_to_text(self, data: List[List[Any]]) -> str:
        """Convert table content to text for embedding"""
        if not data:
            return ""
        
        # Take first few rows for embedding
        max_rows = 5
        content_rows = data[:max_rows]
        
        content_parts = []
        for row in content_rows:
            row_text = ", ".join(str(cell) for cell in row)
            content_parts.append(row_text)
        
        return "; ".join(content_parts)
