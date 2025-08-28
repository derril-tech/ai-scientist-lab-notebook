"""
Plot Worker for AI Scientist Lab Notebook

Handles data transforms, plot generation, faceting, error bars,
and server-side PNG/SVG rendering.
"""

import asyncio
import json
import io
import base64
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pathlib import Path

import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import seaborn as sns
from pydantic import BaseModel, Field

import structlog

logger = structlog.get_logger(__name__)


class PlotSpec(BaseModel):
    """Plot specification schema"""
    plot_id: str
    title: str
    plot_type: str  # line, bar, scatter, box, violin, histogram, heatmap
    data_source: str  # table_id or dataset_id
    x_column: Optional[str] = None
    y_column: Optional[str] = None
    color_column: Optional[str] = None
    facet_column: Optional[str] = None
    transforms: List[Dict[str, Any]] = Field(default_factory=list)
    error_bars: Optional[Dict[str, Any]] = None
    confidence_intervals: Optional[Dict[str, Any]] = None
    style: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class PlotResult(BaseModel):
    """Plot generation result"""
    plot_id: str
    spec: PlotSpec
    png_data: Optional[str] = None  # Base64 encoded PNG
    svg_data: Optional[str] = None  # SVG string
    plotly_json: Optional[str] = None  # Plotly figure JSON
    python_code: Optional[str] = None  # Generated Python code
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PlotWorker:
    """Worker for generating plots with transforms and server-side rendering"""
    
    def __init__(self):
        self.logger = logger.bind(worker="plot")
        self.supported_plot_types = [
            "line", "bar", "scatter", "box", "violin", 
            "histogram", "heatmap", "area", "pie"
        ]
        self.supported_transforms = [
            "filter", "group", "aggregate", "pivot", "melt", 
            "log", "standardize", "sort", "limit"
        ]
    
    async def create_plot(self, spec: PlotSpec, data: pd.DataFrame) -> PlotResult:
        """
        Create a plot based on specification and data
        
        Args:
            spec: Plot specification
            data: Input data as pandas DataFrame
            
        Returns:
            Plot result with rendered images and metadata
        """
        try:
            self.logger.info("Creating plot", plot_id=spec.plot_id, plot_type=spec.plot_type)
            
            # Apply data transforms
            transformed_data = await self._apply_transforms(data, spec.transforms)
            
            # Create plotly figure
            fig = await self._create_plotly_figure(spec, transformed_data)
            
            # Generate different output formats
            png_data = await self._render_png(fig)
            svg_data = await self._render_svg(fig)
            plotly_json = fig.to_json()
            python_code = await self._generate_python_code(spec, transformed_data)
            
            result = PlotResult(
                plot_id=spec.plot_id,
                spec=spec,
                png_data=png_data,
                svg_data=svg_data,
                plotly_json=plotly_json,
                python_code=python_code
            )
            
            self.logger.info("Plot created successfully", plot_id=spec.plot_id)
            return result
            
        except Exception as e:
            self.logger.error("Failed to create plot", plot_id=spec.plot_id, error=str(e))
            return PlotResult(
                plot_id=spec.plot_id,
                spec=spec,
                error=str(e)
            )
    
    async def _apply_transforms(self, data: pd.DataFrame, transforms: List[Dict[str, Any]]) -> pd.DataFrame:
        """
        Apply data transformations to the input DataFrame
        
        Args:
            data: Input DataFrame
            transforms: List of transform specifications
            
        Returns:
            Transformed DataFrame
        """
        result = data.copy()
        
        for transform in transforms:
            transform_type = transform.get("type")
            
            if transform_type == "filter":
                result = await self._apply_filter(result, transform)
            elif transform_type == "group":
                result = await self._apply_group(result, transform)
            elif transform_type == "aggregate":
                result = await self._apply_aggregate(result, transform)
            elif transform_type == "pivot":
                result = await self._apply_pivot(result, transform)
            elif transform_type == "melt":
                result = await self._apply_melt(result, transform)
            elif transform_type == "log":
                result = await self._apply_log(result, transform)
            elif transform_type == "standardize":
                result = await self._apply_standardize(result, transform)
            elif transform_type == "sort":
                result = await self._apply_sort(result, transform)
            elif transform_type == "limit":
                result = await self._apply_limit(result, transform)
            else:
                self.logger.warning("Unknown transform type", transform_type=transform_type)
        
        return result
    
    async def _apply_filter(self, data: pd.DataFrame, transform: Dict[str, Any]) -> pd.DataFrame:
        """Apply filter transform"""
        column = transform.get("column")
        operator = transform.get("operator", "==")
        value = transform.get("value")
        
        if operator == "==":
            return data[data[column] == value]
        elif operator == "!=":
            return data[data[column] != value]
        elif operator == ">":
            return data[data[column] > value]
        elif operator == "<":
            return data[data[column] < value]
        elif operator == ">=":
            return data[data[column] >= value]
        elif operator == "<=":
            return data[data[column] <= value]
        elif operator == "in":
            return data[data[column].isin(value)]
        elif operator == "contains":
            return data[data[column].str.contains(value, na=False)]
        
        return data
    
    async def _apply_group(self, data: pd.DataFrame, transform: Dict[str, Any]) -> pd.DataFrame:
        """Apply group transform"""
        group_columns = transform.get("columns", [])
        if group_columns:
            return data.groupby(group_columns).first().reset_index()
        return data
    
    async def _apply_aggregate(self, data: pd.DataFrame, transform: Dict[str, Any]) -> pd.DataFrame:
        """Apply aggregate transform"""
        group_columns = transform.get("group_by", [])
        agg_dict = transform.get("aggregations", {})
        
        if group_columns and agg_dict:
            return data.groupby(group_columns).agg(agg_dict).reset_index()
        return data
    
    async def _apply_pivot(self, data: pd.DataFrame, transform: Dict[str, Any]) -> pd.DataFrame:
        """Apply pivot transform"""
        index = transform.get("index")
        columns = transform.get("columns")
        values = transform.get("values")
        
        if index and columns and values:
            return data.pivot(index=index, columns=columns, values=values).reset_index()
        return data
    
    async def _apply_melt(self, data: pd.DataFrame, transform: Dict[str, Any]) -> pd.DataFrame:
        """Apply melt transform"""
        id_vars = transform.get("id_vars", [])
        value_vars = transform.get("value_vars", [])
        var_name = transform.get("var_name", "variable")
        value_name = transform.get("value_name", "value")
        
        if value_vars:
            return data.melt(
                id_vars=id_vars, 
                value_vars=value_vars,
                var_name=var_name,
                value_name=value_name
            )
        return data
    
    async def _apply_log(self, data: pd.DataFrame, transform: Dict[str, Any]) -> pd.DataFrame:
        """Apply log transform"""
        column = transform.get("column")
        base = transform.get("base", 10)
        
        if column and column in data.columns:
            if base == 10:
                data[column] = np.log10(data[column])
            elif base == 2:
                data[column] = np.log2(data[column])
            else:
                data[column] = np.log(data[column])
        
        return data
    
    async def _apply_standardize(self, data: pd.DataFrame, transform: Dict[str, Any]) -> pd.DataFrame:
        """Apply standardization transform"""
        column = transform.get("column")
        
        if column and column in data.columns:
            mean_val = data[column].mean()
            std_val = data[column].std()
            if std_val > 0:
                data[column] = (data[column] - mean_val) / std_val
        
        return data
    
    async def _apply_sort(self, data: pd.DataFrame, transform: Dict[str, Any]) -> pd.DataFrame:
        """Apply sort transform"""
        column = transform.get("column")
        ascending = transform.get("ascending", True)
        
        if column and column in data.columns:
            return data.sort_values(column, ascending=ascending)
        return data
    
    async def _apply_limit(self, data: pd.DataFrame, transform: Dict[str, Any]) -> pd.DataFrame:
        """Apply limit transform"""
        limit = transform.get("limit", 1000)
        return data.head(limit)
    
    async def _create_plotly_figure(self, spec: PlotSpec, data: pd.DataFrame) -> go.Figure:
        """
        Create a Plotly figure based on specification and data
        
        Args:
            spec: Plot specification
            data: Transformed data
            
        Returns:
            Plotly figure object
        """
        plot_type = spec.plot_type.lower()
        
        if plot_type == "line":
            return await self._create_line_plot(spec, data)
        elif plot_type == "bar":
            return await self._create_bar_plot(spec, data)
        elif plot_type == "scatter":
            return await self._create_scatter_plot(spec, data)
        elif plot_type == "box":
            return await self._create_box_plot(spec, data)
        elif plot_type == "violin":
            return await self._create_violin_plot(spec, data)
        elif plot_type == "histogram":
            return await self._create_histogram_plot(spec, data)
        elif plot_type == "heatmap":
            return await self._create_heatmap_plot(spec, data)
        elif plot_type == "area":
            return await self._create_area_plot(spec, data)
        elif plot_type == "pie":
            return await self._create_pie_plot(spec, data)
        else:
            raise ValueError(f"Unsupported plot type: {plot_type}")
    
    async def _create_line_plot(self, spec: PlotSpec, data: pd.DataFrame) -> go.Figure:
        """Create line plot"""
        fig = px.line(
            data,
            x=spec.x_column,
            y=spec.y_column,
            color=spec.color_column,
            title=spec.title,
            **spec.style
        )
        
        if spec.error_bars:
            fig = self._add_error_bars(fig, spec.error_bars, data)
        
        return fig
    
    async def _create_bar_plot(self, spec: PlotSpec, data: pd.DataFrame) -> go.Figure:
        """Create bar plot"""
        fig = px.bar(
            data,
            x=spec.x_column,
            y=spec.y_column,
            color=spec.color_column,
            title=spec.title,
            **spec.style
        )
        
        if spec.error_bars:
            fig = self._add_error_bars(fig, spec.error_bars, data)
        
        return fig
    
    async def _create_scatter_plot(self, spec: PlotSpec, data: pd.DataFrame) -> go.Figure:
        """Create scatter plot"""
        fig = px.scatter(
            data,
            x=spec.x_column,
            y=spec.y_column,
            color=spec.color_column,
            title=spec.title,
            **spec.style
        )
        
        if spec.error_bars:
            fig = self._add_error_bars(fig, spec.error_bars, data)
        
        return fig
    
    async def _create_box_plot(self, spec: PlotSpec, data: pd.DataFrame) -> go.Figure:
        """Create box plot"""
        fig = px.box(
            data,
            x=spec.x_column,
            y=spec.y_column,
            color=spec.color_column,
            title=spec.title,
            **spec.style
        )
        return fig
    
    async def _create_violin_plot(self, spec: PlotSpec, data: pd.DataFrame) -> go.Figure:
        """Create violin plot"""
        fig = px.violin(
            data,
            x=spec.x_column,
            y=spec.y_column,
            color=spec.color_column,
            title=spec.title,
            **spec.style
        )
        return fig
    
    async def _create_histogram_plot(self, spec: PlotSpec, data: pd.DataFrame) -> go.Figure:
        """Create histogram plot"""
        fig = px.histogram(
            data,
            x=spec.x_column,
            color=spec.color_column,
            title=spec.title,
            **spec.style
        )
        return fig
    
    async def _create_heatmap_plot(self, spec: PlotSpec, data: pd.DataFrame) -> go.Figure:
        """Create heatmap plot"""
        # For heatmap, we need to pivot the data
        if spec.x_column and spec.y_column:
            pivot_data = data.pivot_table(
                index=spec.y_column,
                columns=spec.x_column,
                values=spec.color_column or spec.y_column,
                aggfunc='mean'
            )
            
            fig = px.imshow(
                pivot_data,
                title=spec.title,
                **spec.style
            )
        else:
            # Use correlation matrix if no specific columns
            corr_matrix = data.corr()
            fig = px.imshow(
                corr_matrix,
                title=spec.title,
                **spec.style
            )
        
        return fig
    
    async def _create_area_plot(self, spec: PlotSpec, data: pd.DataFrame) -> go.Figure:
        """Create area plot"""
        fig = px.area(
            data,
            x=spec.x_column,
            y=spec.y_column,
            color=spec.color_column,
            title=spec.title,
            **spec.style
        )
        return fig
    
    async def _create_pie_plot(self, spec: PlotSpec, data: pd.DataFrame) -> go.Figure:
        """Create pie plot"""
        fig = px.pie(
            data,
            values=spec.y_column,
            names=spec.x_column,
            title=spec.title,
            **spec.style
        )
        return fig
    
    def _add_error_bars(self, fig: go.Figure, error_config: Dict[str, Any], data: pd.DataFrame) -> go.Figure:
        """Add error bars to the figure"""
        error_type = error_config.get("type", "std")
        error_column = error_config.get("column")
        
        if error_column and error_column in data.columns:
            if error_type == "std":
                error_values = data[error_column]
            elif error_type == "se":
                # Standard error
                error_values = data[error_column] / np.sqrt(len(data))
            else:
                error_values = data[error_column]
            
            # Add error bars to the last trace
            fig.data[-1].error_y = dict(
                type='data',
                array=error_values,
                visible=True
            )
        
        return fig
    
    async def _render_png(self, fig: go.Figure) -> str:
        """Render plot as PNG and return base64 encoded string"""
        try:
            # Convert to static image
            img_bytes = fig.to_image(format="png", width=800, height=600)
            return base64.b64encode(img_bytes).decode('utf-8')
        except Exception as e:
            self.logger.error("Failed to render PNG", error=str(e))
            return ""
    
    async def _render_svg(self, fig: go.Figure) -> str:
        """Render plot as SVG and return SVG string"""
        try:
            return fig.to_image(format="svg", width=800, height=600)
        except Exception as e:
            self.logger.error("Failed to render SVG", error=str(e))
            return ""
    
    async def _generate_python_code(self, spec: PlotSpec, data: pd.DataFrame) -> str:
        """Generate Python code for the plot"""
        code_lines = [
            "import pandas as pd",
            "import plotly.express as px",
            "import plotly.graph_objects as go",
            "",
            "# Load your data",
            "data = pd.read_csv('your_data.csv')  # Replace with your data source",
            "",
            "# Apply transforms"
        ]
        
        # Add transform code
        for i, transform in enumerate(spec.transforms):
            transform_type = transform.get("type")
            if transform_type == "filter":
                code_lines.append(f"# Transform {i+1}: Filter")
                code_lines.append(f"data = data[data['{transform.get('column')}'] {transform.get('operator', '==')} {transform.get('value')}]")
            elif transform_type == "group":
                code_lines.append(f"# Transform {i+1}: Group")
                code_lines.append(f"data = data.groupby({transform.get('columns')}).first().reset_index()")
            elif transform_type == "sort":
                code_lines.append(f"# Transform {i+1}: Sort")
                code_lines.append(f"data = data.sort_values('{transform.get('column')}', ascending={transform.get('ascending', True)})")
        
        code_lines.extend([
            "",
            "# Create plot",
            f"fig = px.{spec.plot_type}(",
            f"    data,",
            f"    x='{spec.x_column}'," if spec.x_column else "    x=None,"
        ])
        
        if spec.y_column:
            code_lines.append(f"    y='{spec.y_column}',")
        if spec.color_column:
            code_lines.append(f"    color='{spec.color_column}',")
        
        code_lines.extend([
            f"    title='{spec.title}',",
            ")",
            "",
            "# Display plot",
            "fig.show()"
        ])
        
        return "\n".join(code_lines)
    
    async def create_faceted_plot(self, spec: PlotSpec, data: pd.DataFrame) -> PlotResult:
        """Create a faceted plot with multiple subplots"""
        try:
            if not spec.facet_column:
                raise ValueError("Facet column is required for faceted plots")
            
            # Get unique values for faceting
            facet_values = data[spec.facet_column].unique()
            n_facets = len(facet_values)
            
            # Calculate subplot layout
            cols = min(3, n_facets)
            rows = (n_facets + cols - 1) // cols
            
            # Create subplots
            fig = make_subplots(
                rows=rows, 
                cols=cols,
                subplot_titles=[str(val) for val in facet_values],
                specs=[[{"secondary_y": False}] * cols] * rows
            )
            
            # Add traces for each facet
            for i, facet_value in enumerate(facet_values):
                row = i // cols + 1
                col = i % cols + 1
                
                facet_data = data[data[spec.facet_column] == facet_value]
                
                if spec.plot_type == "line":
                    trace = go.Scatter(
                        x=facet_data[spec.x_column],
                        y=facet_data[spec.y_column],
                        mode='lines+markers',
                        name=str(facet_value)
                    )
                elif spec.plot_type == "scatter":
                    trace = go.Scatter(
                        x=facet_data[spec.x_column],
                        y=facet_data[spec.y_column],
                        mode='markers',
                        name=str(facet_value)
                    )
                elif spec.plot_type == "bar":
                    trace = go.Bar(
                        x=facet_data[spec.x_column],
                        y=facet_data[spec.y_column],
                        name=str(facet_value)
                    )
                else:
                    # Default to scatter
                    trace = go.Scatter(
                        x=facet_data[spec.x_column],
                        y=facet_data[spec.y_column],
                        mode='markers',
                        name=str(facet_value)
                    )
                
                fig.add_trace(trace, row=row, col=col)
            
            # Update layout
            fig.update_layout(
                title=spec.title,
                showlegend=False,
                height=200 * rows,
                width=300 * cols
            )
            
            # Generate outputs
            png_data = await self._render_png(fig)
            svg_data = await self._render_svg(fig)
            plotly_json = fig.to_json()
            python_code = await self._generate_faceted_python_code(spec, data)
            
            return PlotResult(
                plot_id=spec.plot_id,
                spec=spec,
                png_data=png_data,
                svg_data=svg_data,
                plotly_json=plotly_json,
                python_code=python_code
            )
            
        except Exception as e:
            self.logger.error("Failed to create faceted plot", plot_id=spec.plot_id, error=str(e))
            return PlotResult(
                plot_id=spec.plot_id,
                spec=spec,
                error=str(e)
            )
    
    async def _generate_faceted_python_code(self, spec: PlotSpec, data: pd.DataFrame) -> str:
        """Generate Python code for faceted plot"""
        code_lines = [
            "import pandas as pd",
            "import plotly.express as px",
            "import plotly.graph_objects as go",
            "from plotly.subplots import make_subplots",
            "",
            "# Load your data",
            "data = pd.read_csv('your_data.csv')  # Replace with your data source",
            "",
            "# Create faceted plot",
            f"fig = px.{spec.plot_type}(",
            f"    data,",
            f"    x='{spec.x_column}'," if spec.x_column else "    x=None,"
        ]
        
        if spec.y_column:
            code_lines.append(f"    y='{spec.y_column}',")
        if spec.color_column:
            code_lines.append(f"    color='{spec.color_column}',")
        
        code_lines.extend([
            f"    facet_col='{spec.facet_column}',",
            f"    title='{spec.title}',",
            ")",
            "",
            "# Display plot",
            "fig.show()"
        ])
        
        return "\n".join(code_lines)
