-- Phase 4 Schema Updates
-- Update experiments table to match new summary worker schema

-- Drop existing experiments table and recreate with new schema
DROP TABLE IF EXISTS experiments CASCADE;

CREATE TABLE experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    objective TEXT NOT NULL,
    methodology TEXT NOT NULL,
    dataset_description TEXT NOT NULL,
    key_findings JSONB NOT NULL,
    limitations JSONB NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    linked_figures JSONB DEFAULT '[]',
    linked_tables JSONB DEFAULT '[]',
    linked_citations JSONB DEFAULT '[]',
    span_start_chunk_id UUID NOT NULL,
    span_end_chunk_id UUID NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update plots table to match new plot worker schema
DROP TABLE IF EXISTS plots CASCADE;

CREATE TABLE plots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    plot_type VARCHAR(50) NOT NULL,
    data_source VARCHAR(255) NOT NULL,
    x_column VARCHAR(100),
    y_column VARCHAR(100),
    color_column VARCHAR(100),
    facet_column VARCHAR(100),
    transforms JSONB DEFAULT '[]',
    error_bars JSONB,
    confidence_intervals JSONB,
    style JSONB DEFAULT '{}',
    png_data TEXT,
    svg_data TEXT,
    plotly_json TEXT,
    python_code TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for new tables
CREATE INDEX idx_experiments_workspace_id ON experiments(workspace_id);
CREATE INDEX idx_experiments_document_id ON experiments(document_id);
CREATE INDEX idx_plots_workspace_id ON plots(workspace_id);
CREATE INDEX idx_plots_data_source ON plots(data_source);

-- Enable RLS on new tables
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view their workspace experiments" ON experiments
    FOR SELECT USING (true); -- TODO: Implement proper workspace membership check

CREATE POLICY "Users can view their workspace plots" ON plots
    FOR SELECT USING (true); -- TODO: Implement proper workspace membership check

-- Add update triggers
CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON experiments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plots_updated_at BEFORE UPDATE ON plots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
