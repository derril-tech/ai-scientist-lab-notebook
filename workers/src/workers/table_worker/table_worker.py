"""
Table Worker implementation
Handles table normalization, header inference, units (UCUM), and type inference
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
import structlog
import re
from datetime import datetime

logger = structlog.get_logger(__name__)


class TableWorker:
    """Table processing worker for data normalization"""
    
    def __init__(self):
        self.logger = logger.bind(worker="table_worker")
        
        # UCUM (Unified Code for Units of Measure) patterns
        self.ucum_patterns = {
            'length': r'\b(m|cm|mm|km|in|ft|yd|mi)\b',
            'mass': r'\b(kg|g|mg|lb|oz)\b',
            'time': r'\b(s|min|h|d|yr|ms|μs)\b',
            'temperature': r'\b(°C|°F|K)\b',
            'volume': r'\b(L|mL|m³|cm³|gal|qt|pt)\b',
            'area': r'\b(m²|cm²|km²|in²|ft²)\b',
            'concentration': r'\b(mol/L|M|mM|μM|nM|pM|%|ppm|ppb)\b',
            'pressure': r'\b(Pa|kPa|MPa|bar|atm|psi)\b',
            'energy': r'\b(J|kJ|cal|kcal|eV)\b',
            'power': r'\b(W|kW|mW|μW)\b',
            'frequency': r'\b(Hz|kHz|MHz|GHz)\b',
            'voltage': r'\b(V|mV|μV|kV)\b',
            'current': r'\b(A|mA|μA|nA)\b',
            'resistance': r'\b(Ω|kΩ|MΩ|mΩ)\b',
            'capacitance': r'\b(F|mF|μF|nF|pF)\b',
            'inductance': r'\b(H|mH|μH|nH)\b'
        }
    
    async def process_table(self, table_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a table for normalization
        
        Args:
            table_data: Table data and metadata
            
        Returns:
            Normalized table with schema and metadata
        """
        try:
            self.logger.info("Starting table processing", 
                           table_id=table_data.get('table_id'))
            
            # Extract table data
            raw_data = table_data.get('data', [])
            if not raw_data:
                raise ValueError("No table data provided")
            
            # Convert to pandas DataFrame
            df = pd.DataFrame(raw_data)
            
            # Infer headers if not provided
            headers = await self.infer_headers(df)
            
            # Infer column types
            column_types = await self.infer_column_types(df)
            
            # Detect units
            units = await self.detect_units(df, headers)
            
            # Create schema
            schema = await self.create_schema(headers, column_types, units)
            
            # Normalize data
            normalized_data = await self.normalize_data(df, schema)
            
            result = {
                'table_id': table_data.get('table_id'),
                'schema': schema,
                'normalized_data': normalized_data,
                'metadata': {
                    'row_count': len(df),
                    'column_count': len(df.columns),
                    'processing_time': 0.0  # TODO: Add timing
                }
            }
            
            self.logger.info("Table processing completed", 
                           table_id=table_data.get('table_id'),
                           row_count=len(df),
                           column_count=len(df.columns))
            
            return result
            
        except Exception as e:
            self.logger.error("Table processing failed", 
                            table_id=table_data.get('table_id'),
                            error=str(e))
            raise
    
    async def infer_headers(self, df: pd.DataFrame) -> List[str]:
        """Infer column headers from data"""
        try:
            headers = []
            
            for col_idx, col in enumerate(df.columns):
                # Check if first row looks like a header
                first_value = str(df.iloc[0, col_idx]) if len(df) > 0 else ""
                
                # Simple header detection heuristics
                if self._looks_like_header(first_value):
                    headers.append(first_value)
                    # Remove header row from data
                    df = df.iloc[1:].reset_index(drop=True)
                else:
                    headers.append(f"Column_{col_idx + 1}")
            
            return headers
            
        except Exception as e:
            self.logger.error("Header inference failed", error=str(e))
            # Fallback to generic headers
            return [f"Column_{i+1}" for i in range(len(df.columns))]
    
    async def infer_column_types(self, df: pd.DataFrame) -> Dict[str, str]:
        """Infer column data types"""
        try:
            column_types = {}
            
            for col in df.columns:
                col_data = df[col].dropna()
                
                if len(col_data) == 0:
                    column_types[col] = 'string'
                    continue
                
                # Try to infer type
                if self._is_numeric(col_data):
                    if self._is_integer(col_data):
                        column_types[col] = 'integer'
                    else:
                        column_types[col] = 'float'
                elif self._is_datetime(col_data):
                    column_types[col] = 'datetime'
                elif self._is_boolean(col_data):
                    column_types[col] = 'boolean'
                else:
                    column_types[col] = 'string'
            
            return column_types
            
        except Exception as e:
            self.logger.error("Column type inference failed", error=str(e))
            # Fallback to string for all columns
            return {col: 'string' for col in df.columns}
    
    async def detect_units(self, df: pd.DataFrame, headers: List[str]) -> Dict[str, Optional[str]]:
        """Detect units in column headers and data"""
        try:
            units = {}
            
            for col, header in zip(df.columns, headers):
                # Check header for units
                header_unit = self._extract_unit_from_text(header)
                
                if header_unit:
                    units[col] = header_unit
                else:
                    # Check sample data for units
                    sample_data = df[col].dropna().head(10)
                    data_unit = self._extract_unit_from_data(sample_data)
                    units[col] = data_unit
            
            return units
            
        except Exception as e:
            self.logger.error("Unit detection failed", error=str(e))
            return {col: None for col in df.columns}
    
    async def create_schema(self, headers: List[str], column_types: Dict[str, str], units: Dict[str, Optional[str]]) -> Dict[str, Any]:
        """Create table schema"""
        try:
            schema = {
                'columns': [],
                'primary_key': None,
                'constraints': []
            }
            
            for i, header in enumerate(headers):
                col_name = self._sanitize_column_name(header)
                
                column_schema = {
                    'name': col_name,
                    'original_name': header,
                    'type': column_types.get(col_name, 'string'),
                    'unit': units.get(col_name),
                    'nullable': True,
                    'index': i
                }
                
                # Add constraints based on type
                if column_types.get(col_name) == 'integer':
                    column_schema['constraints'] = ['integer_range']
                elif column_types.get(col_name) == 'float':
                    column_schema['constraints'] = ['float_range']
                
                schema['columns'].append(column_schema)
            
            return schema
            
        except Exception as e:
            self.logger.error("Schema creation failed", error=str(e))
            raise
    
    async def normalize_data(self, df: pd.DataFrame, schema: Dict[str, Any]) -> List[List[Any]]:
        """Normalize data according to schema"""
        try:
            normalized_data = []
            
            for _, row in df.iterrows():
                normalized_row = []
                
                for col_schema in schema['columns']:
                    col_name = col_schema['original_name']
                    col_type = col_schema['type']
                    
                    value = row[col_name]
                    
                    # Normalize value based on type
                    normalized_value = self._normalize_value(value, col_type)
                    normalized_row.append(normalized_value)
                
                normalized_data.append(normalized_row)
            
            return normalized_data
            
        except Exception as e:
            self.logger.error("Data normalization failed", error=str(e))
            raise
    
    def _looks_like_header(self, text: str) -> bool:
        """Check if text looks like a column header"""
        if not text or pd.isna(text):
            return False
        
        text = str(text).strip()
        
        # Header indicators
        header_indicators = [
            len(text) < 50,  # Short text
            text.isupper() or text.istitle(),  # Capitalized
            not text.replace('.', '').replace(',', '').replace(' ', '').isdigit(),  # Not just numbers
            any(word in text.lower() for word in ['name', 'id', 'type', 'value', 'unit', 'date', 'time'])
        ]
        
        return sum(header_indicators) >= 2
    
    def _is_numeric(self, series: pd.Series) -> bool:
        """Check if series contains numeric data"""
        try:
            pd.to_numeric(series, errors='raise')
            return True
        except (ValueError, TypeError):
            return False
    
    def _is_integer(self, series: pd.Series) -> bool:
        """Check if series contains integer data"""
        try:
            numeric_series = pd.to_numeric(series, errors='coerce')
            return (numeric_series % 1 == 0).all()
        except (ValueError, TypeError):
            return False
    
    def _is_datetime(self, series: pd.Series) -> bool:
        """Check if series contains datetime data"""
        try:
            pd.to_datetime(series, errors='raise')
            return True
        except (ValueError, TypeError):
            return False
    
    def _is_boolean(self, series: pd.Series) -> bool:
        """Check if series contains boolean data"""
        unique_values = series.unique()
        boolean_indicators = ['true', 'false', 'yes', 'no', '1', '0', 't', 'f', 'y', 'n']
        
        return all(str(v).lower() in boolean_indicators for v in unique_values)
    
    def _extract_unit_from_text(self, text: str) -> Optional[str]:
        """Extract unit from text using UCUM patterns"""
        if not text:
            return None
        
        text = str(text).lower()
        
        for unit_type, pattern in self.ucum_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                return matches[0]
        
        return None
    
    def _extract_unit_from_data(self, series: pd.Series) -> Optional[str]:
        """Extract unit from data values"""
        # Check first few non-null values
        sample_values = series.head(5).astype(str)
        
        for value in sample_values:
            unit = self._extract_unit_from_text(value)
            if unit:
                return unit
        
        return None
    
    def _sanitize_column_name(self, name: str) -> str:
        """Sanitize column name for database use"""
        # Remove special characters and replace spaces with underscores
        sanitized = re.sub(r'[^a-zA-Z0-9_]', '_', name)
        sanitized = re.sub(r'_+', '_', sanitized)  # Replace multiple underscores with single
        sanitized = sanitized.strip('_')  # Remove leading/trailing underscores
        
        # Ensure it starts with a letter
        if sanitized and not sanitized[0].isalpha():
            sanitized = 'col_' + sanitized
        
        return sanitized.lower()
    
    def _normalize_value(self, value: Any, target_type: str) -> Any:
        """Normalize value to target type"""
        if pd.isna(value):
            return None
        
        try:
            if target_type == 'integer':
                return int(float(value))
            elif target_type == 'float':
                return float(value)
            elif target_type == 'datetime':
                return pd.to_datetime(value).isoformat()
            elif target_type == 'boolean':
                return bool(value) if value in [True, False, 1, 0] else str(value).lower() in ['true', 'yes', '1', 't', 'y']
            else:
                return str(value)
        except (ValueError, TypeError):
            return str(value)
